import { CREATE_INDEX_STATEMENTS, CREATE_TABLE_STATEMENTS } from '../schema.js';

/**
 * Cria todas as tabelas e índices do schema (Fase 3). Uma migration só
 * cresce dali pra frente — qualquer mudança de schema futura vira uma nova
 * migration (002, 003, ...), nunca uma edição retroativa desta aqui.
 */
export const migration001Initial = {
  version: 1,
  async up(driver) {
    for (const statement of CREATE_TABLE_STATEMENTS) {
      await driver.run(statement);
    }
    for (const statement of CREATE_INDEX_STATEMENTS) {
      await driver.run(statement);
    }
  },
};
