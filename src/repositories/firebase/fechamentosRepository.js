import * as fechamentoService from '../../features/planejamento/services/fechamentoService.js';

/** @type {import('../contracts.js').FechamentosRepository} */
export const fechamentosRepository = {
  get: fechamentoService.getFechamento,
  fechar: fechamentoService.fecharMes,
};
