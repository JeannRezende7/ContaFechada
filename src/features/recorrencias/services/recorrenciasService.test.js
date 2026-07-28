import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestore = vi.hoisted(() => ({
  createUserDoc: vi.fn(),
  updateUserDoc: vi.fn(),
  deleteUserDoc: vi.fn(),
  listUserDocs: vi.fn(),
  listUserDocsInRange: vi.fn(),
  batchSetUserDocs: vi.fn(),
}));

vi.mock('../../../firebase/firestore.js', () => firestore);

import {
  createRecorrencia,
  ensureGeneratedForMonths,
} from './recorrenciasService.js';

describe('recorrenciasService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestore.listUserDocsInRange.mockResolvedValue([]);
  });

  it('always creates a recurrence template as active', () => {
    createRecorrencia('u1', { descricao: 'Aluguel', ativo: false });
    expect(firestore.createUserDoc).toHaveBeenCalledWith('u1', 'recorrencias', {
      descricao: 'Aluguel',
      ativo: true,
    });
  });

  it('generates deterministic monthly entries once and clamps the due day', async () => {
    const recorrencias = [{
      id: 'r1',
      tipo: 'despesa',
      descricao: 'Academia',
      valor: 99,
      diaVencimento: 31,
      ativo: true,
      mesInicio: '2026-01',
    }];

    const created = await ensureGeneratedForMonths('u1', ['2026-02', '2026-01', '2026-02'], recorrencias);

    expect(created).toBe(true);
    expect(firestore.listUserDocsInRange).toHaveBeenCalledWith('u1', 'lancamentos', {
      field: 'mesReferencia',
      gte: '2026-01',
      lte: '2026-02',
    });
    expect(firestore.batchSetUserDocs).toHaveBeenCalledWith('u1', 'lancamentos', {
      'r1_2026-01': expect.objectContaining({ dataVencimento: '2026-01-31', origemRecorrenciaId: 'r1' }),
      'r1_2026-02': expect.objectContaining({ dataVencimento: '2026-02-28', origemRecorrenciaId: 'r1' }),
    });
  });

  it('skips inactive, pre-start and already-generated recurrence instances', async () => {
    firestore.listUserDocsInRange.mockResolvedValue([{ id: 'r1_2026-07' }]);
    const recorrencias = [
      { id: 'r1', ativo: true, mesInicio: '2026-07', diaVencimento: 10, tipo: 'despesa', valor: 10 },
      { id: 'r2', ativo: true, mesInicio: '2026-08', diaVencimento: 10, tipo: 'despesa', valor: 20 },
      { id: 'r3', ativo: false, mesInicio: '2026-01', diaVencimento: 10, tipo: 'despesa', valor: 30 },
    ];

    const created = await ensureGeneratedForMonths('u1', ['2026-07'], recorrencias);

    expect(created).toBe(false);
    expect(firestore.batchSetUserDocs).not.toHaveBeenCalled();
  });

  it('does not query Firestore when no months or active recurrences were supplied', async () => {
    expect(await ensureGeneratedForMonths('u1', [], [])).toBe(false);
    expect(await ensureGeneratedForMonths('u1', ['2026-07'], [{ id: 'r1', ativo: false }])).toBe(false);
    expect(firestore.listUserDocsInRange).not.toHaveBeenCalled();
  });
});
