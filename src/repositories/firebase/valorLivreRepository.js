import * as valorLivreService from '../../features/valor-livre/services/valorLivreService.js';

/** @type {import('../contracts.js').ValorLivreRepository} */
export const valorLivreRepository = {
  getDistribuicaoMensal: valorLivreService.getDistribuicaoMensal,
  setDistribuicaoMensal: valorLivreService.setDistribuicaoMensal,
};
