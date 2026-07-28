import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lancamentos/services/lancamentosService.js', () => ({
  listLancamentosByMonth: vi.fn(),
}));

vi.mock('../../recorrencias/services/recorrenciasService.js', () => ({
  listRecorrencias: vi.fn(),
  ensureGeneratedForMonths: vi.fn(),
}));

vi.mock('../../../firebase/firestore.js', () => ({
  getUserDoc: vi.fn(),
  setUserDocMerged: vi.fn(),
}));

import { listLancamentosByMonth } from '../../lancamentos/services/lancamentosService.js';
import {
  listRecorrencias,
  ensureGeneratedForMonths,
} from '../../recorrencias/services/recorrenciasService.js';
import {
  getDashboardData,
  getDashboardMemoryCache,
  syncDashboardRecorrencias,
} from './dashboardService.js';

const atual = [
  {
    id: 'receita',
    tipo: 'receita',
    valor: 1000,
    status: 'recebido',
    dataVencimento: '2026-07-05',
  },
  {
    id: 'despesa',
    tipo: 'despesa',
    valor: 250,
    status: 'pendente',
    dataVencimento: '2026-07-10',
  },
];

const anterior = [
  {
    id: 'anterior',
    tipo: 'despesa',
    valor: 200,
    status: 'pago',
    dataVencimento: '2026-06-10',
  },
];

describe('dashboardService progressive loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listLancamentosByMonth.mockImplementation((_, monthKey) =>
      Promise.resolve(monthKey === '2026-07' ? atual : anterior)
    );
  });

  it('loads visible totals without waiting for recurrence queries', async () => {
    const result = await getDashboardData('uid-1', '2026-07');

    expect(listLancamentosByMonth).toHaveBeenCalledTimes(2);
    expect(listRecorrencias).not.toHaveBeenCalled();
    expect(ensureGeneratedForMonths).not.toHaveBeenCalled();
    expect(result.indicators.saldoMes).toBe(750);
    expect(result.indicators.totalAPagar).toBe(250);
    expect(result.comparacao.despesaAtual).toBe(250);
  });

  it('forwards cache source and keeps cached data in session memory', async () => {
    const cached = await getDashboardData('uid-cache', '2026-07', { source: 'cache' });

    expect(listLancamentosByMonth).toHaveBeenCalledWith('uid-cache', '2026-07', { source: 'cache' });
    expect(getDashboardMemoryCache('uid-cache', '2026-07')).toBe(cached);

    const server = await getDashboardData('uid-cache', '2026-07', { source: 'server' });

    expect(getDashboardMemoryCache('uid-cache', '2026-07')).toBe(server);
  });

  it('uses one recurrence synchronization call for current and previous month', async () => {
    listRecorrencias.mockResolvedValue([{ id: 'r1', ativo: true }]);
    ensureGeneratedForMonths.mockResolvedValue(false);

    const result = await syncDashboardRecorrencias('uid-1', '2026-07');

    expect(ensureGeneratedForMonths).toHaveBeenCalledOnce();
    expect(ensureGeneratedForMonths).toHaveBeenCalledWith(
      'uid-1',
      ['2026-06', '2026-07'],
      [{ id: 'r1', ativo: true }]
    );
    expect(result).toBeNull();
    expect(listLancamentosByMonth).not.toHaveBeenCalled();
  });

  it('re-reads both months only when recurrence instances were created', async () => {
    listRecorrencias.mockResolvedValue([{ id: 'r1', ativo: true }]);
    ensureGeneratedForMonths.mockResolvedValue(true);

    const result = await syncDashboardRecorrencias('uid-1', '2026-07');

    expect(listLancamentosByMonth).toHaveBeenCalledTimes(2);
    expect(result.indicators.saldoMes).toBe(750);
  });
});
