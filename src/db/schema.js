/**
 * Fase 3 do roadmap local-first — schema SQLite do Android. Cada tabela
 * espelha uma coleção Firestore (`users/{uid}/{subcollection}` em
 * `src/firebase/firestore.js`) e carrega os mesmos metadados de
 * sincronização da Fase 2 (`createdAt`, `updatedAt`, `deletedAt`,
 * `deviceId`, `syncStatus`, `localVersion`). Datas de metadados ficam em
 * ISO 8601 UTC (texto); datas financeiras (`dataVencimento` etc.) continuam
 * `'YYYY-MM-DD'`, como no Firestore.
 *
 * `aportAutomatico`/`orcamentos`/`distribuicoes` guardam objetos aninhados
 * — SQLite não tem tipo objeto, então ficam serializados como texto JSON,
 * igual a como o app já lida com JSON em outros lugares (ex.: exportação).
 */

const SYNC_COLUMNS = `
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  device_id TEXT NOT NULL,
  sync_status TEXT NOT NULL,
  local_version INTEGER NOT NULL
`;

export const CREATE_TABLE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS lancamentos (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    valor REAL NOT NULL,
    data_vencimento TEXT NOT NULL,
    data_pagamento TEXT,
    status TEXT NOT NULL,
    observacoes TEXT,
    categoria_id TEXT,
    origem_recorrencia_id TEXT,
    mes_referencia TEXT,
    parcelamento_id TEXT,
    parcela_atual INTEGER,
    total_parcelas INTEGER,
    ${SYNC_COLUMNS}
  )`,

  `CREATE TABLE IF NOT EXISTS categorias (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL,
    cor_key TEXT NOT NULL,
    icone TEXT NOT NULL,
    padrao INTEGER NOT NULL DEFAULT 0,
    ordem INTEGER NOT NULL,
    ${SYNC_COLUMNS}
  )`,

  `CREATE TABLE IF NOT EXISTS regras_categorizacao (
    id TEXT PRIMARY KEY,
    termo TEXT NOT NULL,
    tipo TEXT NOT NULL,
    categoria_id TEXT NOT NULL,
    prioridade INTEGER NOT NULL DEFAULT 0,
    ativa INTEGER NOT NULL DEFAULT 1,
    ${SYNC_COLUMNS}
  )`,

  `CREATE TABLE IF NOT EXISTS recorrencias (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    valor REAL NOT NULL,
    dia_vencimento INTEGER NOT NULL,
    ativo INTEGER NOT NULL DEFAULT 1,
    observacoes TEXT,
    mes_inicio TEXT,
    categoria_id TEXT,
    ${SYNC_COLUMNS}
  )`,

  `CREATE TABLE IF NOT EXISTS metas (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    valor_alvo REAL NOT NULL,
    valor_atual REAL NOT NULL DEFAULT 0,
    cor_key TEXT NOT NULL,
    aporte_automatico TEXT,
    ultimo_aporte_automatico_mes TEXT,
    ultimo_aporte_automatico_valor REAL,
    ${SYNC_COLUMNS}
  )`,

  `CREATE TABLE IF NOT EXISTS valor_livre (
    month_key TEXT PRIMARY KEY,
    distribuicoes TEXT NOT NULL,
    ${SYNC_COLUMNS}
  )`,

  `CREATE TABLE IF NOT EXISTS planejamento (
    month_key TEXT PRIMARY KEY,
    saldo_inicial REAL NOT NULL DEFAULT 0,
    orcamentos TEXT NOT NULL,
    ${SYNC_COLUMNS}
  )`,

  `CREATE TABLE IF NOT EXISTS fechamentos (
    month_key TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    saldo_inicial REAL NOT NULL,
    receitas REAL NOT NULL,
    despesas REAL NOT NULL,
    saldo_calculado REAL NOT NULL,
    saldo_real REAL NOT NULL,
    diferenca REAL NOT NULL,
    pendencias_no_fechamento INTEGER NOT NULL DEFAULT 0,
    total_lancamentos INTEGER NOT NULL DEFAULT 0,
    observacoes TEXT,
    pendencias_transferidas INTEGER NOT NULL DEFAULT 0,
    fechado_em TEXT NOT NULL,
    ${SYNC_COLUMNS}
  )`,

  `CREATE TABLE IF NOT EXISTS gestor_lancamentos (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    valor REAL NOT NULL,
    data_vencimento TEXT,
    data_pagamento TEXT,
    status TEXT,
    observacoes TEXT,
    categoria_id TEXT,
    origem_recorrencia_id TEXT,
    recorrencia_importada INTEGER NOT NULL DEFAULT 0,
    parcelamento_id TEXT,
    parcela_atual INTEGER,
    total_parcelas INTEGER,
    ${SYNC_COLUMNS}
  )`,

  /**
   * Espelha o padrão do doc `config/geral` do Firestore (um documento com
   * vários campos soltos, de dono variado) como pares chave/valor — cada
   * `valor` é um JSON escalar (`JSON.stringify(x)`), então uma config nova
   * não pede migration.
   */
  `CREATE TABLE IF NOT EXISTS configuracoes (
    chave TEXT PRIMARY KEY,
    valor TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    entidade TEXT NOT NULL,
    registro_id TEXT NOT NULL,
    operacao TEXT NOT NULL,
    payload TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    tentativas INTEGER NOT NULL DEFAULT 0,
    proxima_tentativa_em TEXT,
    created_at TEXT NOT NULL,
    erro TEXT
  )`,

  /**
   * Pares chave/valor de uso geral: versão do schema (`schema_version`) e,
   * mais adiante (Fase 7), o cursor `updatedAt` da última sincronização por
   * coleção (`cursor:<entidade>`).
   */
  `CREATE TABLE IF NOT EXISTS sync_state (
    chave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
  )`,
];

export const CREATE_INDEX_STATEMENTS = [
  // Lançamentos por mês/vencimento, categoria e recorrência — as três
  // consultas mais frequentes do app (telas de Lançamentos, Dashboard,
  // Relatórios, Planejamento).
  `CREATE INDEX IF NOT EXISTS idx_lancamentos_data_vencimento ON lancamentos (data_vencimento)`,
  `CREATE INDEX IF NOT EXISTS idx_lancamentos_categoria_id ON lancamentos (categoria_id)`,
  `CREATE INDEX IF NOT EXISTS idx_lancamentos_origem_recorrencia_id ON lancamentos (origem_recorrencia_id)`,
  `CREATE INDEX IF NOT EXISTS idx_lancamentos_mes_referencia ON lancamentos (mes_referencia)`,
  `CREATE INDEX IF NOT EXISTS idx_lancamentos_updated_at ON lancamentos (updated_at)`,

  `CREATE INDEX IF NOT EXISTS idx_categorias_ordem ON categorias (ordem)`,
  `CREATE INDEX IF NOT EXISTS idx_recorrencias_ativo ON recorrencias (ativo)`,
  `CREATE INDEX IF NOT EXISTS idx_gestor_lancamentos_categoria_id ON gestor_lancamentos (categoria_id)`,

  // Operações pendentes por estado e data — fila de sincronização (Fase 6).
  `CREATE INDEX IF NOT EXISTS idx_sync_queue_status_proxima_tentativa ON sync_queue (status, proxima_tentativa_em)`,
  `CREATE INDEX IF NOT EXISTS idx_sync_queue_entidade_registro ON sync_queue (entidade, registro_id)`,
];
