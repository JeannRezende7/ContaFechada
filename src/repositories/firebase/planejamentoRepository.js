import * as planejamentoService from '../../features/planejamento/services/planejamentoService.js';

/** @type {import('../contracts.js').PlanejamentoRepository} */
export const planejamentoRepository = {
  getMensal: planejamentoService.getPlanejamentoMensal,
  setSaldoInicial: planejamentoService.setSaldoInicial,
  setOrcamentoCategoria: planejamentoService.setOrcamentoCategoria,
};
