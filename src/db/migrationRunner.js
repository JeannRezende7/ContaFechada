const BOOTSTRAP_SQL = `CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
)`;

/** Current schema version applied to this database (0 if never migrated). */
export async function getSchemaVersion(driver) {
  await driver.run(BOOTSTRAP_SQL);
  const row = await driver.get('SELECT MAX(version) as version FROM schema_migrations');
  return row?.version ?? 0;
}

/**
 * Applies every migration with `version` above the database's current
 * version, in ascending order, each inside its own transaction — an
 * interrupted migration never leaves the schema half-applied (Fase 3
 * critério de conclusão: "interromper o app não deixa dados parciais").
 * Re-running against an already up-to-date database is a no-op.
 *
 * @returns {Promise<number[]>} versions actually applied, in order.
 */
export async function runMigrations(driver, migrations) {
  const current = await getSchemaVersion(driver);
  const pending = [...migrations].filter((m) => m.version > current).sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    await driver.transaction(async (tx) => {
      await migration.up(tx);
      await tx.run('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', [
        migration.version,
        new Date().toISOString(),
      ]);
    });
  }

  return pending.map((m) => m.version);
}
