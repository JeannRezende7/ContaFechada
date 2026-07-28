import * as recorrenciasService from '../../features/recorrencias/services/recorrenciasService.js';

/** @type {import('../contracts.js').RecorrenciasRepository} */
export const recorrenciasRepository = {
  list: recorrenciasService.listRecorrencias,
  create: recorrenciasService.createRecorrencia,
  update: recorrenciasService.updateRecorrencia,
  remove: recorrenciasService.deleteRecorrencia,
  ensureGeneratedForMonths: recorrenciasService.ensureGeneratedForMonths,
  ensureGeneratedForMonth: recorrenciasService.ensureGeneratedForMonth,
};
