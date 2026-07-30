import { DatabaseSync } from 'node:sqlite';

/**
 * Driver de teste/desenvolvimento sobre o módulo nativo `node:sqlite`.
 * Existe só para os testes de schema/migrations/repositórios rodarem contra
 * um SQLite real sem precisar de Android/Capacitor — nenhum arquivo de
 * produção importa isto (o bundle do app roda no navegador/WebView, onde
 * `node:sqlite` não existe, então o Rollup nunca o inclui no build).
 *
 * @param {string} [filename] - ':memory:' (padrão) ou um caminho de arquivo.
 * @returns {import('./driver.js').SqlDriver & { close: () => void }}
 */
export function createNodeSqliteDriver(filename = ':memory:') {
  const db = new DatabaseSync(filename);

  function run(sql, params = []) {
    const info = db.prepare(sql).run(...params);
    return Promise.resolve({ changes: info.changes });
  }

  function all(sql, params = []) {
    return Promise.resolve(db.prepare(sql).all(...params));
  }

  function get(sql, params = []) {
    const row = db.prepare(sql).get(...params);
    return Promise.resolve(row ?? null);
  }

  const driver = { run, all, get };

  driver.transaction = async function transaction(fn) {
    db.exec('BEGIN');
    try {
      await fn(driver);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  };

  driver.close = () => db.close();

  return driver;
}
