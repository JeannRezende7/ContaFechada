/**
 * Driver de produção sobre `@capacitor-community/sqlite`. AINDA NÃO
 * TESTADO CONTRA UM DISPOSITIVO/EMULADOR REAL — este ambiente de
 * desenvolvimento não tem Android Studio, `adb` nem `ANDROID_HOME`
 * instalados (mesma limitação já registrada em ROADMAP_MONETIZACAO.txt
 * para o Google Play Billing). O wrapper segue a API pública documentada
 * do plugin (`query`/`run`/`execute` de uma `SQLiteDBConnection` já aberta),
 * mas precisa ser validado manualmente antes de qualquer uso real:
 *
 * - Confirmar o formato exato de retorno de `run()`
 *   (`{ changes: { changes, lastId } }` na versão instalada).
 * - Decidir e testar a estratégia pra web (o plugin exige o web component
 *   `jeep-sqlite` + um asset `sql-wasm.wasm` sendo servido) — não incluída
 *   aqui de propósito, por não haver como testar no navegador/CI atual.
 * - Abrir/fechar a conexão (`SQLiteConnection.createConnection`/`.open()`)
 *   fica fora deste arquivo, a cargo de quem inicializa o app nativo — só a
 *   forma de rodar SQL numa conexão já aberta está implementada aqui.
 *
 * @param {import('@capacitor-community/sqlite').SQLiteDBConnection} connection
 * @returns {import('./driver.js').SqlDriver}
 */
export function createCapacitorSqliteDriver(connection) {
  async function run(sql, params = []) {
    const result = await connection.run(sql, params);
    return { changes: result?.changes?.changes ?? 0 };
  }

  async function all(sql, params = []) {
    const result = await connection.query(sql, params);
    return result?.values ?? [];
  }

  async function get(sql, params = []) {
    const rows = await all(sql, params);
    return rows[0] ?? null;
  }

  const driver = { run, all, get };

  driver.transaction = async function transaction(fn) {
    await connection.execute('BEGIN TRANSACTION');
    try {
      await fn(driver);
      await connection.execute('COMMIT');
    } catch (error) {
      await connection.execute('ROLLBACK');
      throw error;
    }
  };

  return driver;
}
