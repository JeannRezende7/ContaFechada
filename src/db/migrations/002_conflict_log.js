/**
 * Fase 7 do roadmap local-first: "Registrar conflitos relevantes" + "Criar
 * ferramenta interna para diagnóstico". Uma linha por conflito detectado ao
 * baixar alterações remotas (`sync/downloadRemoteChanges.js`) — relógio do
 * aparelho de origem incorreto, ou uma edição local mais nova que a que
 * chegou da nuvem (a que "perde" por enquanto, sob a regra "mais recente
 * vence", mas fica registrada em vez de desaparecer silenciosamente).
 */
export const migration002ConflictLog = {
  version: 2,
  async up(driver) {
    await driver.run(`CREATE TABLE IF NOT EXISTS conflict_log (
      id TEXT PRIMARY KEY,
      entidade TEXT NOT NULL,
      registro_id TEXT NOT NULL,
      motivo TEXT NOT NULL,
      detalhes TEXT,
      criado_em TEXT NOT NULL
    )`);
    await driver.run(
      'CREATE INDEX IF NOT EXISTS idx_conflict_log_entidade_registro ON conflict_log (entidade, registro_id)'
    );
  },
};
