import { lancamentosRepository } from './firebase/lancamentosRepository.js';
import { categoriasRepository } from './firebase/categoriasRepository.js';
import { regrasCategorizacaoRepository } from './firebase/regrasCategorizacaoRepository.js';
import { recorrenciasRepository } from './firebase/recorrenciasRepository.js';
import { metasRepository } from './firebase/metasRepository.js';
import { valorLivreRepository } from './firebase/valorLivreRepository.js';
import { planejamentoRepository } from './firebase/planejamentoRepository.js';
import { fechamentosRepository } from './firebase/fechamentosRepository.js';
import { gestorRepository } from './firebase/gestorRepository.js';
import { configuracoesRepository } from './firebase/configuracoesRepository.js';
import { isNativeLocalDatabaseAvailable, getLocalDatabase } from '../db/localDatabase.js';
import { createSqliteRepositories } from './sqlite/repositories.js';

/** @type {import('./contracts.js').Repositories} */
const firebaseRepositories = {
  lancamentos: lancamentosRepository,
  categorias: categoriasRepository,
  regrasCategorizacao: regrasCategorizacaoRepository,
  recorrencias: recorrenciasRepository,
  metas: metasRepository,
  valorLivre: valorLivreRepository,
  planejamento: planejamentoRepository,
  fechamentos: fechamentosRepository,
  gestor: gestorRepository,
  configuracoes: configuracoesRepository,
};

/**
 * Escolhe a implementação de repositórios conforme a plataforma. Hoje só
 * existe a implementação Firebase — a Fase 3 (SQLite no Android) adiciona
 * `./sqlite/*Repository.js` e passa a retorná-la aqui quando
 * `Capacitor.isNativePlatform()` for verdadeiro. Nenhum código fora deste
 * arquivo deve decidir qual implementação usar.
 *
 * @returns {import('./contracts.js').Repositories}
 */
let activeRepositories = firebaseRepositories;
let initialization;

export async function initializeRepositories() {
  if (!isNativeLocalDatabaseAvailable()) {
    activeRepositories = firebaseRepositories;
    return activeRepositories;
  }
  if (!initialization) {
    initialization = getLocalDatabase()
      .then((driver) => {
        activeRepositories = createSqliteRepositories(driver);
        return activeRepositories;
      })
      .catch((error) => {
        initialization = undefined;
        throw error;
      });
  }
  return initialization;
}

export function getRepositories() {
  return activeRepositories;
}

const repositoryNames = Object.keys(firebaseRepositories);
export const repositories = Object.fromEntries(repositoryNames.map((name) => [
  name,
  new Proxy({}, {
    get(_target, property) {
      const method = activeRepositories[name]?.[property];
      return typeof method === 'function' ? method.bind(activeRepositories[name]) : method;
    },
  }),
]));
