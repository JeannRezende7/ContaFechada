import * as gestorService from '../../features/gestor/services/gestorService.js';

/** @type {import('../contracts.js').GestorRepository} */
export const gestorRepository = {
  list: gestorService.listGestorLancamentos,
  create: gestorService.createGestorLancamento,
  update: gestorService.updateGestorLancamento,
  remove: gestorService.deleteGestorLancamento,
  removeByIds: gestorService.deleteGestorLancamentosByIds,
  removeAll: gestorService.deleteAllGestorLancamentos,
  createParcelamento: gestorService.createParcelamentoGestor,
  importarDoMovimento: gestorService.importarDoMovimento,
  importarFatura: gestorService.importarFaturaParaGestor,
  importarRecorrencias: gestorService.importarRecorrencias,
  getUsaMovimento: gestorService.getGestorUsaMovimento,
  setUsaMovimento: gestorService.setGestorUsaMovimento,
};
