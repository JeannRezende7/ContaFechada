import { describe, expect, it } from 'vitest';
import { buildDueNotifications } from './notificationService.js';

describe('notificações de vencimento', () => {
  it('agenda conta para a véspera e ignora itens realizados', () => {
    const items = [
      { id: 'a', tipo: 'despesa', descricao: 'Internet', status: 'pendente', dataVencimento: '2026-07-30' },
      { id: 'b', tipo: 'receita', descricao: 'Recebida', status: 'recebido', dataVencimento: '2026-07-30' },
    ];
    const result = buildDueNotifications(items, { hour: 9, now: new Date('2026-07-28T08:00:00') });
    expect(result.some((item) => item.body === 'Internet' && item.schedule.at.getDate() === 29)).toBe(true);
    expect(result.some((item) => item.body === 'Recebida')).toBe(false);
  });
});
