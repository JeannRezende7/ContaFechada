const STATE_KEY = 'firstSync:workflow';
const VALID_CHOICES = new Set(['upload', 'download', 'merge']);

const INITIAL_STATE = Object.freeze({
  status: 'idle',
  choice: null,
  preview: null,
  result: null,
  error: null,
  updatedAt: null,
});

export async function readFirstSyncState(driver, stateKey = STATE_KEY) {
  const row = await driver.get('SELECT valor FROM sync_state WHERE chave = ?', [stateKey]);
  if (!row?.valor) return { ...INITIAL_STATE };
  try {
    return { ...INITIAL_STATE, ...JSON.parse(row.valor) };
  } catch {
    return { ...INITIAL_STATE, status: 'error', error: 'Estado local de primeira sincronização inválido.' };
  }
}

async function writeState(driver, patch, stateKey) {
  const current = await readFirstSyncState(driver, stateKey);
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await driver.run('INSERT OR REPLACE INTO sync_state (chave, valor) VALUES (?, ?)', [
    stateKey,
    JSON.stringify(next),
  ]);
  return next;
}

export function createFirstSyncController({
  driver,
  uid,
  previewFirstSync,
  createBackup,
  upload,
  download,
  merge,
  stateKey = STATE_KEY,
}) {
  async function prepare() {
    await writeState(driver, { status: 'previewing', error: null }, stateKey);
    try {
      const preview = await previewFirstSync();
      return writeState(driver, { status: 'awaiting_choice', preview, result: null }, stateKey);
    } catch (error) {
      await writeState(driver, { status: 'error', error: error.message }, stateKey);
      throw error;
    }
  }

  async function execute(choice) {
    if (!VALID_CHOICES.has(choice)) throw new TypeError(`Opção inválida: ${choice}`);
    await writeState(driver, { status: 'backing_up', choice, error: null }, stateKey);
    try {
      const backup = await createBackup({ uid, choice });
      if (!backup?.persisted) throw new Error('O backup local não foi confirmado.');
      await writeState(driver, { status: 'running', choice, backup: backup.reference ?? true }, stateKey);
      const result =
        choice === 'upload' ? await upload() :
        choice === 'download' ? await download() :
        await merge();
      return writeState(driver, { status: 'completed', choice, result, error: null }, stateKey);
    } catch (error) {
      await writeState(driver, { status: 'error', choice, error: error.message }, stateKey);
      throw error;
    }
  }

  async function resume() {
    const state = await readFirstSyncState(driver, stateKey);
    if (!state.choice || !['backing_up', 'running', 'error'].includes(state.status)) return state;
    return execute(state.choice);
  }

  async function reset() {
    return writeState(driver, { ...INITIAL_STATE }, stateKey);
  }

  return { getState: () => readFirstSyncState(driver, stateKey), prepare, execute, resume, reset };
}
