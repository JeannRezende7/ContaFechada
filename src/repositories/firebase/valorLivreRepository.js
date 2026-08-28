import * as valorLivreService from '../../features/valor-livre/services/valorLivreService.js';

/** @type {import('../contracts.js').ValorLivreRepository} */
export const valorLivreRepository = {
  getDistribuicao: valorLivreService.getDistribuicao,
  getDistribuicaoMensal: valorLivreService.getDistribuicaoMensal,
  setDistribuicao: valorLivreService.setDistribuicao,
  getValorBaseMensal: valorLivreService.getValorBaseMensal,
  setValorBaseMensal: valorLivreService.setValorBaseMensal,
  ensureValorBaseMensal: valorLivreService.ensureValorBaseMensal,
  getFotografiaMensal: valorLivreService.getFotografiaMensal,
  ensureFotografiaMensal: valorLivreService.ensureFotografiaMensal,
  setValorBaseDoMovimento: valorLivreService.setValorBaseDoMovimento,
  setDistribuicaoMensal: valorLivreService.setDistribuicaoMensal,
};
