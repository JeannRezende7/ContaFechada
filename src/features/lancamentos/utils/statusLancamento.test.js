import { describe, expect, it } from 'vitest';
import { getStatusEfetivo } from './statusLancamento.js';

describe('status efetivo do lançamento', () => {
  it('considera atrasado um pendente vencido', () => {
    expect(getStatusEfetivo({ status: 'pendente', dataVencimento: '2026-08-06' }, '2026-08-07')).toBe('atrasado');
  });

  it('mantém pendente o lançamento que vence hoje ou no futuro', () => {
    expect(getStatusEfetivo({ status: 'pendente', dataVencimento: '2026-08-07' }, '2026-08-07')).toBe('pendente');
    expect(getStatusEfetivo({ status: 'pendente', dataVencimento: '2026-08-08' }, '2026-08-07')).toBe('pendente');
  });

  it('não altera lançamentos já concluídos ou agendados', () => {
    expect(getStatusEfetivo({ status: 'pago', dataVencimento: '2026-08-01' }, '2026-08-07')).toBe('pago');
    expect(getStatusEfetivo({ status: 'recebido', dataVencimento: '2026-08-01' }, '2026-08-07')).toBe('recebido');
    expect(getStatusEfetivo({ status: 'agendado', dataVencimento: '2026-08-01' }, '2026-08-07')).toBe('agendado');
  });
});

