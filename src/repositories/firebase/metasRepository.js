import * as metasService from '../../features/metas/services/metasService.js';

/** @type {import('../contracts.js').MetasRepository} */
export const metasRepository = {
  list: metasService.listMetas,
  create: metasService.createMeta,
  update: metasService.updateMeta,
  remove: metasService.deleteMeta,
  aportar: metasService.aportarNaMeta,
  calcularAporteAutomatico: metasService.calcularAporteAutomatico,
  processarAportesAutomaticos: metasService.processarAportesAutomaticos,
  preverConclusao: metasService.preverConclusaoMeta,
};
