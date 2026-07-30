export const migration003LocalDocuments = {
  version: 3,
  async up(driver) {
    await driver.run(`CREATE TABLE IF NOT EXISTS local_documents (
      dominio TEXT NOT NULL,
      id TEXT NOT NULL,
      dados TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      device_id TEXT NOT NULL,
      sync_status TEXT NOT NULL,
      local_version INTEGER NOT NULL,
      PRIMARY KEY (dominio, id)
    )`);
    await driver.run(
      'CREATE INDEX IF NOT EXISTS idx_local_documents_dominio_updated ON local_documents (dominio, updated_at)'
    );
  },
};
