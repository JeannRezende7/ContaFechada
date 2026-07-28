import * as lancamentosService from '../../features/lancamentos/services/lancamentosService.js';

/** @type {import('../contracts.js').LancamentosRepository} */
export const lancamentosRepository = {
  listByMonth: lancamentosService.listLancamentosByMonth,
  listAll: lancamentosService.listAllLancamentos,
  listByRange: lancamentosService.listLancamentosByRange,
  hasAny: lancamentosService.hasAnyLancamento,
  create: lancamentosService.createLancamento,
  update: lancamentosService.updateLancamento,
  remove: lancamentosService.deleteLancamento,
  removeAll: lancamentosService.deleteAllLancamentos,
  removeByIds: lancamentosService.deleteLancamentosByIds,
  setStatus: lancamentosService.setLancamentoStatus,
  setCategoriaForRecorrencia: lancamentosService.setCategoriaForRecorrencia,
  updateGeneratedFromRecorrencia: lancamentosService.updateGeneratedFromRecorrencia,
  removeGeneratedFromRecorrencia: lancamentosService.deleteGeneratedFromRecorrencia,
  buildParcelamentoItems: lancamentosService.buildParcelamentoItems,
  createParcelamento: lancamentosService.createParcelamento,
  buildImportPayload: lancamentosService.buildImportPayload,
  importLancamentos: lancamentosService.importLancamentos,
  updateEmMassa: lancamentosService.updateLancamentosEmMassa,
};
