/**
 * Interface comum de acesso ao SQLite, implementada por dois drivers:
 * `nodeSqliteDriver.js` (Node `node:sqlite`, só testes/dev — nunca importado
 * pelo app em produção) e `capacitorSqliteDriver.js` (plugin
 * `@capacitor-community/sqlite`, produção). Repositórios SQLite dependem só
 * deste contrato, nunca do driver concreto — o mesmo desenho de
 * `src/repositories/contracts.js` para a camada de cima.
 *
 * @typedef {Object} SqlRunResult
 * @property {number} changes
 *
 * @typedef {Object} SqlDriver
 * @property {(sql: string, params?: any[]) => Promise<SqlRunResult>} run   - INSERT/UPDATE/DELETE/DDL, sem linhas de volta.
 * @property {(sql: string, params?: any[]) => Promise<Record<string, any>[]>} all - SELECT, todas as linhas.
 * @property {(sql: string, params?: any[]) => Promise<Record<string, any>|null>} get - SELECT, só a primeira linha (ou null).
 * @property {(fn: (tx: SqlDriver) => Promise<void>) => Promise<void>} transaction - roda várias operações atomicamente.
 */

export {};
