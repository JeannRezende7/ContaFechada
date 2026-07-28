import * as categoriasService from '../../features/categorias/services/categoriasService.js';

/** @type {import('../contracts.js').CategoriasRepository} */
export const categoriasRepository = {
  list: categoriasService.listCategorias,
  create: categoriasService.createCategoria,
  remove: categoriasService.deleteCategoria,
  removeAll: categoriasService.deleteAllCategorias,
  ensureDefaults: categoriasService.ensureDefaultCategorias,
};
