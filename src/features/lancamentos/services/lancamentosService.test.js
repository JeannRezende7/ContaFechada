import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestore = vi.hoisted(() => ({
  createUserDoc: vi.fn(),
  updateUserDoc: vi.fn(),
  deleteUserDoc: vi.fn(),
  deleteAllUserDocs: vi.fn(),
  deleteUserDocsByIds: vi.fn(),
  batchUpdateUserDocs: vi.fn(),
  batchUpdateUserDocsWithData: vi.fn(),
  listUserDocs: vi.fn(),
  listUserDocsInRange: vi.fn(),
  listUserDocsWhereEquals: vi.fn(),
  batchSetUserDocs: vi.fn(),
  hasAnyUserDoc: vi.fn(),
}));

vi.mock('../../../firebase/firestore.js', () => firestore);

import {
  buildImportPayload,
  buildParcelamentoItems,
  createLancamento,
  deleteGeneratedFromRecorrencia,
  importLancamentos,
  listLancamentosByMonth,
  setCategoriaForRecorrencia,
  setLancamentoStatus,
  updateGeneratedFromRecorrencia,
} from './lancamentosService.js';

describe('lancamentosService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates CRUD and monthly range with the expected user collection', () => {
    createLancamento('u1', { descricao: 'Salário' });
    setLancamentoStatus('u1', 'l1', 'recebido');
    listLancamentosByMonth('u1', '2026-02', { source: 'cache' });

    expect(firestore.createUserDoc).toHaveBeenCalledWith('u1', 'lancamentos', { descricao: 'Salário' });
    expect(firestore.updateUserDoc).toHaveBeenCalledWith('u1', 'lancamentos', 'l1', { status: 'recebido' });
    expect(firestore.listUserDocsInRange).toHaveBeenCalledWith('u1', 'lancamentos', {
      field: 'dataVencimento',
      gte: '2026-02-01',
      lte: '2026-02-31',
      source: 'cache',
    });
  });

  it('splits installments without losing cents and clamps invalid month days', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('parcelamento-teste');

    const { parcelamentoId, itemsById } = buildParcelamentoItems({
      tipo: 'despesa',
      descricao: 'Notebook',
      valorTotal: 100,
      numParcelas: 3,
      dataVencimento: '2026-01-31',
    });
    const items = Object.values(itemsById);

    expect(parcelamentoId).toBe('parcelamento-teste');
    expect(items.map((item) => item.valor)).toEqual([33.33, 33.33, 33.34]);
    expect(items.reduce((sum, item) => sum + item.valor, 0)).toBe(100);
    expect(items.map((item) => item.dataVencimento)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
    ]);
    expect(items[2]).toMatchObject({ parcelaAtual: 3, totalParcelas: 3, status: 'pendente' });
  });

  it('expands an imported installment from the current parcel to the final one', () => {
    const { novos, totalConsiderados } = buildImportPayload([
      {
        tipo: 'despesa',
        descricao: 'Curso Online',
        valor: 49.9,
        dataVencimento: '2026-01-31',
        parcelaAtual: 2,
        totalParcelas: 4,
      },
    ], new Set(['imp-curso-online_3']));

    expect(totalConsiderados).toBe(3);
    expect(Object.keys(novos)).toEqual(['imp-curso-online_2', 'imp-curso-online_4']);
    expect(novos['imp-curso-online_2']).toMatchObject({
      status: 'pago',
      dataPagamento: '2026-01-31',
      dataVencimento: '2026-01-31',
    });
    expect(novos['imp-curso-online_4']).toMatchObject({
      status: 'pendente',
      dataPagamento: null,
      dataVencimento: '2026-03-31',
    });
  });

  it('deduplicates repeated non-installment entries in the same import', () => {
    const item = {
      tipo: 'despesa',
      descricao: 'Mercado',
      valor: 123.45,
      dataVencimento: '2026-07-10',
    };
    const { novos, totalConsiderados } = buildImportPayload([item, item], new Set());

    expect(totalConsiderados).toBe(2);
    expect(Object.keys(novos)).toHaveLength(1);
    expect(Object.values(novos)[0]).toMatchObject({ status: 'pago', dataPagamento: '2026-07-10' });
  });

  it('reports imported and duplicate counts and writes only new documents', async () => {
    firestore.listUserDocs.mockResolvedValue([{ id: 'imp-mercado-2026-07-10-12345' }]);
    const itens = [
      { tipo: 'receita', descricao: 'Pix recebido', valor: 50, dataVencimento: '2026-07-11' },
    ];

    const result = await importLancamentos('u1', itens);

    expect(result).toEqual({ importados: 1, duplicados: 0 });
    expect(firestore.batchSetUserDocs).toHaveBeenCalledOnce();
  });

  it('updates generated entries and deletes only recurrence instances from the selected month onward', async () => {
    firestore.listUserDocsWhereEquals
      .mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }])
      .mockResolvedValueOnce([
        { id: 'jan', mesReferencia: '2026-01' },
        { id: 'jul', mesReferencia: '2026-07' },
        { id: 'ago', mesReferencia: '2026-08' },
      ]);

    await setCategoriaForRecorrencia('u1', 'r1', 'c1');
    await deleteGeneratedFromRecorrencia('u1', 'r1', { fromMonthKey: '2026-07' });

    expect(firestore.batchUpdateUserDocs).toHaveBeenCalledWith('u1', 'lancamentos', ['a', 'b'], {
      categoriaId: 'c1',
    });
    expect(firestore.deleteUserDocsByIds).toHaveBeenCalledWith('u1', 'lancamentos', ['jul', 'ago']);
  });

  it('updates generated recurrence entries only from the selected month and recalculates due dates', async () => {
    firestore.listUserDocsWhereEquals.mockResolvedValue([
      { id: 'jun', mesReferencia: '2026-06' },
      { id: 'jul', mesReferencia: '2026-07' },
      { id: 'fev', mesReferencia: '2027-02' },
    ]);
    const data = {
      descricao: 'Aluguel reajustado',
      valor: 1500,
      diaVencimento: 31,
      categoriaId: 'moradia',
      observacoes: 'Novo contrato',
    };

    const count = await updateGeneratedFromRecorrencia('u1', 'r1', data, '2026-07');

    expect(count).toBe(2);
    expect(firestore.batchUpdateUserDocsWithData).toHaveBeenCalledWith('u1', 'lancamentos', {
      jul: {
        descricao: 'Aluguel reajustado',
        valor: 1500,
        dataVencimento: '2026-07-31',
        categoriaId: 'moradia',
        observacoes: 'Novo contrato',
      },
      fev: {
        descricao: 'Aluguel reajustado',
        valor: 1500,
        dataVencimento: '2027-02-28',
        categoriaId: 'moradia',
        observacoes: 'Novo contrato',
      },
    });
  });
});
