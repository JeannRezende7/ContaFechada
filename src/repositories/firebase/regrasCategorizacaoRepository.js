import * as regrasCategorizacaoService from '../../features/categorias/services/regrasCategorizacaoService.js';

/** @type {import('../contracts.js').RegrasCategorizacaoRepository} */
export const regrasCategorizacaoRepository = {
  list: regrasCategorizacaoService.listRegrasCategorizacao,
  create: regrasCategorizacaoService.createRegraCategorizacao,
  update: regrasCategorizacaoService.updateRegraCategorizacao,
  remove: regrasCategorizacaoService.deleteRegraCategorizacao,
  aplicarAosAntigos: regrasCategorizacaoService.aplicarRegrasAosAntigos,
};
