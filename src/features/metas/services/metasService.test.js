import { describe, expect, it } from 'vitest';
import { calcularAporteAutomatico, preverConclusaoMeta } from './metasService.js';

describe('automação de metas', () => {
  it('calcula percentual apenas sobre receitas recebidas', () => {
    const meta = { aporteAutomatico: { tipo: 'percentual_receita', valor: 10 } };
    const value = calcularAporteAutomatico(meta, [
      { tipo: 'receita', status: 'recebido', valor: 1000 },
      { tipo: 'receita', status: 'pendente', valor: 500 },
    ]);
    expect(value).toBe(100);
  });

  it('prevê o mês de conclusão', () => {
    expect(preverConclusaoMeta({ valorAtual: 100, valorAlvo: 500 }, 100, '2026-07')).toBe('2026-11');
  });
});
