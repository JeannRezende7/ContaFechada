# Roadmap — Android local-first, nuvem Premium e acesso web

## Objetivo

Transformar o Conta Fechada em um produto com dois modos claros:

- **Android gratuito:** funciona sem conta e mantém os dados somente no aparelho.
- **Android Premium:** ativa conta, backup e sincronização pelo Firebase.
- **Web:** exige login e assinatura Premium ativa.

O aplicativo local deve continuar funcionando quando o usuário estiver offline,
cancelar a assinatura ou estiver temporariamente sem acesso ao Firebase.

---

## Princípios da migração

1. O banco local será a fonte principal no Android.
2. A nuvem será uma réplica opcional, não uma dependência para abrir o app.
3. Nenhuma migração poderá apagar dados automaticamente.
4. Toda operação de sincronização deverá ser repetível sem criar duplicatas.
5. Cancelar o Premium não poderá bloquear os dados locais.
6. O acesso web dependerá de uma autorização Premium validada no servidor.
7. Compras digitais dentro do Android usarão Google Play Billing.
8. A migração será gradual, mantendo o aplicativo utilizável entre as fases.

---

## Arquitetura-alvo

```text
ANDROID GRATUITO

Interface React
      ↓
Repositórios
      ↓
SQLite local


ANDROID PREMIUM

Interface React
      ↓
Repositórios
      ↓
SQLite local
      ↓
Fila de sincronização
      ↓
Firebase Auth + Firestore


WEB PREMIUM

Interface React
      ↓
Firebase Auth
      ↓
Verificação de assinatura
      ↓
Firestore
```

---

# Fase 0 — Preparação e decisões [CONCLUÍDA em 2026-07-30, com 2 pendências fora de código]

Decisões formalizadas em [FASE0_DECISOES.md](FASE0_DECISOES.md).

## Entregas

- [x] Definir prazo de retenção dos dados na nuvem após cancelamento.
- [x] Definir período de tolerância offline do Premium.
- [x] Definir política de conflito entre aparelhos.
- [x] Definir quais funções pertencem ao gratuito e ao Premium.
- [ ] Criar ambientes Firebase separados para desenvolvimento e produção —
      PENDENTE: exige acesso ao Firebase Console, só o dono do projeto pode fazer.
- [ ] Registrar métricas atuais de leituras, gravações e usuários ativos —
      PENDENTE: idem, consultar o painel de uso do Firebase Console.

## Decisões recomendadas

- Retenção após cancelamento: **90 dias**.
- Tolerância Premium offline: **7 dias**.
- Conflito inicial: **alteração mais recente vence**.
- Exportação manual: disponível para todos.
- Sincronização e web: exclusivas do Premium.

## Critério de conclusão

- [x] Regras comerciais, técnicas e de retenção documentadas.

---

# Fase 1 — Camada de repositórios [CONCLUÍDA em 2026-07-30]

Implementada em `src/repositories/` (contratos em `contracts.js`,
implementação Firebase em `firebase/*Repository.js`, seleção de plataforma
em `provider.js`). Achado importante: o app já não tinha telas chamando o
Firestore direto — todo serviço de feature já passava por um wrapper
genérico (`src/firebase/firestore.js`), o que reduziu bastante o risco
desta fase frente à estimativa original.

## Objetivo

Impedir que as telas conheçam diretamente o Firestore ou o SQLite.

## Entregas

- [x] Criar contratos para:
  - lançamentos;
  - categorias;
  - regras de categorização;
  - recorrências;
  - metas;
  - valor livre;
  - planejamento;
  - fechamentos;
  - gestor financeiro;
  - configurações.
- [x] Adaptar os serviços Firebase atuais para implementar esses contratos.
- [x] Criar um provedor que selecione o repositório conforme a plataforma
      (`getRepositories()` em `provider.js` — hoje sempre retorna a
      implementação Firebase; pronto para a Fase 3 plugar SQLite).
- [x] Remover chamadas diretas ao Firestore das páginas e componentes —
      todas as páginas/componentes que importavam um `*Service.js` de
      feature direto agora importam `repositories`.

## Exemplo

```js
const lancamentos = repositories.lancamentos;

await lancamentos.listByMonth(monthKey);
await lancamentos.create(data);
await lancamentos.update(id, data);
await lancamentos.remove(id);
```

## Critério de conclusão

- [x] Todas as telas continuam funcionando com Firebase por meio dos repositórios.
- [x] Nenhuma regra de negócio depende diretamente do SDK do Firestore.
- [x] Testes existentes continuam aprovados.

---

# Fase 2 — Identidade local e IDs universais [PREPARAÇÃO CONCLUÍDA em 2026-07-30]

Implementada em `src/utils/deviceId.js` e `src/firebase/firestore.js`,
ainda 100% sobre Firebase — esta fase só prepara o esquema de dados
(id/metadados) para a Fase 3/4, não altera nenhum comportamento visível
hoje. Ver critério de conclusão abaixo: o app ainda exige `uid` para
qualquer escrita, isso só muda com SQLite (Fase 3) e o modo sem conta
(Fase 4).

## Objetivo

Permitir criação de dados sem conta e garantir que sejam sincronizáveis depois.

## Entregas

- [x] Gerar e persistir um `deviceId`.
- [x] Usar UUID nos novos registros — `createUserDoc`/`setUserDoc`/
      `batchSetUserDocs` agora geram o id no cliente (`crypto.randomUUID()`)
      em vez do id automático do Firestore.
- [x] Acrescentar metadados locais:

```js
{
  id,
  createdAt,
  updatedAt,
  deletedAt,
  deviceId,
  syncStatus,
  localVersion
}
```

- [x] Garantir que importações e recorrências sejam idempotentes — já valia
      antes desta fase (ids determinísticos em `lancamentosService.js`/
      `recorrenciasService.js`), preservado sem mudanças.
- [x] Padronizar datas em UTC para metadados de sincronização —
      `serverTimestamp()` do Firestore já é UTC por natureza.
- [x] Manter datas financeiras no formato local já usado pelo produto —
      inalterado (`dataVencimento` etc. continuam `'YYYY-MM-DD'`).

## Estados de sincronização

- `local`: nunca enviado.
- `pending`: aguardando envio.
- `syncing`: envio em andamento.
- `synced`: confirmado pela nuvem.
- `conflict`: requer resolução.
- `error`: falha persistente.

Hoje todo registro grava `syncStatus: 'synced'` na hora da criação/edição,
porque toda escrita ainda vai direto pro Firestore — não existe fila local
ainda (essa é a Fase 6). Os demais estados (`local`, `pending`, `syncing`,
`conflict`, `error`) ficam reservados para quando o caminho de escrita
local (Fase 3/6) existir.

## Critério de conclusão

- [ ] Registros podem ser criados sem `uid` — AINDA NÃO: o app continua
      100% Firebase Auth + Firestore por usuário; só passa a valer depois
      da Fase 3 (SQLite) e da Fase 4 (modo sem conta).
- [x] IDs locais não colidem com IDs vindos da nuvem — todo id agora é um
      UUID v4 gerado no cliente, o mesmo esquema que um registro criado
      offline vai usar.

---

# Fase 3 — Banco SQLite no Android [INICIADA em 2026-07-30 — schema/migrations/2 domínios prontos, integração Capacitor NÃO TESTADA]

Este ambiente de desenvolvimento não tem Android Studio, `adb` nem
`ANDROID_HOME` (mesma limitação já registrada em ROADMAP_MONETIZACAO.txt
para o Google Play Billing) — nada aqui pôde ser validado num
dispositivo/emulador real. O que é lógica pura (schema, migrations,
adapters de repositório) foi escrito E testado de verdade contra SQLite via
o módulo `node:sqlite` do Node; a ponte com o plugin Capacitor em si
(`src/db/drivers/capacitorSqliteDriver.js`) segue a API pública documentada
mas está marcada como não testada no próprio arquivo.

Implementado:
- `src/db/schema.js` — DDL de todas as 12 tabelas + índices.
- `src/db/migrations/` + `migrationRunner.js` — versionamento, testado
  (aplica, é idempotente, e uma migration quebrada faz rollback sem deixar
  schema parcial).
- `src/db/drivers/driver.js` — contrato comum; `nodeSqliteDriver.js` (só
  testes) e `capacitorSqliteDriver.js` (produção, não testado).
- `src/repositories/sqlite/categoriasRepository.js` e
  `lancamentosRepository.js` — implementam o mesmo contrato de
  `repositories/contracts.js`, testados contra SQLite real.

NÃO feito ainda nesta rodada:
- Adapters SQLite para os outros 8 domínios (regras de categorização,
  recorrências, metas, valor livre, planejamento, fechamentos, gestor
  financeiro, configurações).
- `lancamentosRepository` do SQLite só cobre o CRUD e as consultas por
  período — `createParcelamento`, `importLancamentos`, `updateEmMassa` e as
  operações ligadas a recorrência ainda não foram portadas.
- `src/repositories/provider.js` continua sempre retornando a implementação
  Firebase — o SQLite não está "ligado" (deliberado: alternar a fonte de
  dados de verdade sem poder testar num Android real seria arriscado
  demais).

## Objetivo

Tornar o SQLite a fonte principal da versão Android.

## Entregas

- [x] Adicionar integração SQLite compatível com Capacitor —
      dependência `@capacitor-community/sqlite` instalada; driver de
      produção escrito, NÃO TESTADO contra dispositivo real.
- [x] Criar migrations versionadas do banco.
- [x] Criar tabelas e índices para consultas frequentes.
- [x] Implementar transações para operações em lote — `driver.transaction()`,
      usado pelo migration runner.
- [~] Criar adaptadores SQLite para os repositórios — só Categorias e
      Lançamentos (núcleo) por enquanto; os outros 8 domínios faltam.
- [ ] Manter IndexedDB apenas para a versão web — ainda não mexido; hoje
      web e Android continuam 100% Firebase/Firestore.

## Tabelas principais

- `lancamentos`
- `categorias`
- `regras_categorizacao`
- `recorrencias`
- `metas`
- `valor_livre`
- `planejamento`
- `fechamentos`
- `gestor_lancamentos`
- `configuracoes`
- `sync_queue`
- `sync_state`

## Índices prioritários

- Lançamentos por mês e vencimento.
- Lançamentos por categoria.
- Lançamentos por recorrência.
- Operações pendentes por estado e data.
- Registros alterados desde a última sincronização.

## Critério de conclusão

- [ ] Todos os módulos Android funcionam em modo avião após fechar e reabrir
      o app — impossível confirmar sem dispositivo/emulador real.
- [ ] Criar, editar e excluir dados não requer Firebase — verdadeiro só para
      Categorias/Lançamentos, e só na lógica (não plugado no app de verdade).
- [x] Testes cobrem atualização de schema e recuperação após interrupção —
      `migrationRunner.test.js` cobre idempotência e rollback de migration
      quebrada.

---

# Fase 4 — Modo gratuito sem conta [BLOQUEADA — depende da Fase 3 terminar]

Só foi criado `src/utils/localSession.js` (flag "modo gratuito local" em
`localStorage`, independente do Firebase Auth, testada). Nada mais desta
fase foi feito de propósito: toda tela do app (Lançamentos, Categorias,
Metas, ...) chama `repositories.<dominio>.<metodo>(uid, ...)`, e hoje só 2
dos 10 domínios têm adapter SQLite — ligar "Continuar gratuitamente" nas
rotas agora abriria um app onde a maioria das telas quebra ao tentar
ler/gravar. Faltam, nesta ordem, antes de retomar a Fase 4 de verdade:

1. Portar os 8 domínios restantes pra `repositories/sqlite/`.
2. `provider.js` escolher SQLite quando não houver `uid` autenticado.
3. Validar tudo isso num dispositivo/emulador Android real.

## Objetivo

Permitir uso completo do núcleo financeiro sem autenticação.

## Entregas

- [ ] Alterar o fluxo inicial:
  - “Continuar gratuitamente”;
  - “Entrar na minha conta”.
- [ ] Remover `ProtectedRoute` do modo local Android.
- [x] Criar uma sessão local independente do Firebase Auth —
      `src/utils/localSession.js`, testado; ainda não usado por nenhuma rota.
- [ ] Adaptar onboarding para explicar o armazenamento no aparelho.
- [ ] Adicionar avisos sobre desinstalação e perda do dispositivo.
- [ ] Disponibilizar exportação e importação local.
- [ ] Adicionar “Apagar dados deste aparelho”.

## Critério de conclusão

- [ ] Uma instalação nova cria lançamentos sem internet e sem conta.
- [ ] O usuário entende que o plano gratuito não possui backup automático.

---

# Fase 5 — Migração segura dos dados atuais [INICIADA em 2026-07-30 — lógica pronta e testada para 2 domínios, não plugada no app]

Implementada em `src/db/migration/migrateFromFirestore.js`, testada de
verdade (SQLite via `node:sqlite` + Firestore simulado com fixtures,
incluindo Timestamp). Só cobre os domínios que já têm adapter SQLite (Fase
3): categorias e lançamentos — os outros 8 ficam para quando ganharem
adapter próprio. Ninguém chama esta função a partir do app ainda (não há
tela/hook de "detectar usuário existente" ligando nela) — falta a Fase 3
terminar de portar os domínios restantes antes disso fazer sentido de
verdade.

## Fluxo

- [ ] Detectar usuário existente autenticado — não plugado no app ainda.
- [x] Verificar se a migração local já foi concluída —
      `getFirestoreMigrationState`, guarda versão/data em `sync_state`.
- [x] Baixar todas as coleções do usuário — só categorias/lançamentos por
      ora, via os repositórios Firebase da Fase 1.
- [x] Validar quantidade e somatórios — contagem e soma de `valor` antes x
      depois; diverge = `MigrationValidationError`.
- [x] Gravar tudo em uma transação SQLite — `driver.transaction()`.
- [x] Comparar origem e destino.
- [x] Marcar a migração como concluída — `sync_state` (`migration:firestore:*`).
- [x] Manter os dados na nuvem — este módulo nunca chama nenhum delete no
      Firestore.

## Proteções

- [x] Nunca apagar a origem automaticamente.
- [~] Criar backup JSON antes da migração — os dados buscados são
      retornados em `result.backup` antes de qualquer escrita; salvar isso
      como arquivo (ex.: reaproveitando `downloadJson`) fica a cargo de quem
      chamar, propositalmente, pra este módulo continuar testável sem
      navegador.
- [x] Permitir repetir a migração — `force: true`, idempotente
      (`INSERT OR REPLACE` pelo mesmo id do Firestore, nunca duplica).
- [x] Registrar versão e data da migração.
- [x] Mostrar resumo ao usuário — `result.summary`; falta a tela que exibe
      isso (depende da Fase 3/4 estarem prontas pra essa tela fazer sentido).

## Critério de conclusão

- [x] Contagens e valores financeiros coincidem antes e depois da migração
      — testado, inclusive o caso de divergência (joga erro, não marca
      concluída).
- [x] Interromper o app no meio da migração não deixa dados parciais —
      mesma garantia de transação já testada em `migrationRunner.test.js`.

---

# Fase 6 — Fila de sincronização Premium [INICIADA em 2026-07-30 — mecânica da fila pronta e testada, nada ligado no app]

Implementada em `src/db/sync/` (`syncQueue.js`, `backoff.js`,
`processSyncQueue.js`) + `src/firebase/syncUploader.js` (adapter real pro
Firestore). Tudo testado — a fila em si contra SQLite real, o envio contra
um `uploader` fake e contra `firebase/firestore.js` mockado (mesmo padrão
dos outros testes do projeto). O que falta é orquestração de verdade: nada
no app hoje chama `enqueue` quando um dado muda, nem roda
`processSyncQueue` periodicamente — isso depende de `repositories/sqlite`
ser a fonte ativa (Fase 3/4), e de saber se o usuário é Premium e está
online (`PremiumContext`/`navigator.onLine`, não verificados aqui).

## Entregas

- [x] Implementar tabela `sync_queue` — Fase 3.
- [x] Registrar operações de criação, edição e exclusão —
      `enqueue(driver, { entidade, registroId, operacao, payload })`.
- [x] Enviar operações em lotes — `processSyncQueue({ batchSize })`.
- [x] Aplicar retry com espera progressiva — `backoff.js` +
      `markFailed` (dobra o intervalo a cada tentativa, até um teto).
- [x] Usar chaves idempotentes — upload via `setUserDoc` no próprio id do
      registro (nunca `createUserDoc`, que geraria outro id a cada retry).
- [ ] Criar exclusões lógicas com `deletedAt` — os repositórios SQLite
      (Fase 3) ainda fazem hard delete; a fila já sabe processar uma
      operação `delete`, mas nada ainda a dispara com soft-delete de origem.
- [x] Mostrar quantidade de operações pendentes — `countPending(driver)`;
      falta a tela que exibe isso.
- [ ] Pausar sincronização sem internet ou sem Premium — não verificado
      aqui; quem for chamar `processSyncQueue` periodicamente precisa
      checar `navigator.onLine` e `isPremium` antes.

## Regras

- [x] A interface nunca espera a nuvem para salvar — `enqueue` só grava
      local; enviar de verdade é um passo `processSyncQueue` à parte.
- [x] Uma operação só sai da fila após confirmação — `markSynced` só roda
      depois do `uploader` resolver com sucesso.
- [x] Repetir uma operação não cria documentos duplicados — mesma garantia
      de id da Fase 2, mais `setUserDoc` no upload.
- [x] Operações do mesmo registro podem ser consolidadas — `enqueue`
      consolida create+update, create+delete, update+update e update+delete
      contra qualquer entrada ainda `pending` (testado); uma entrada já
      `syncing` não é mexida, uma nova mudança vira uma entrada própria.

## Critério de conclusão

- [ ] Alterações feitas offline chegam à nuvem quando a conexão retorna —
      a mecânica existe e está testada; falta ligar num app que realmente
      escreve local primeiro (Fase 3/4) pra valer de ponta a ponta.
- [x] Fechar o aplicativo não perde a fila — é uma tabela SQLite comum,
      sobrevive a fechar/reabrir o processo (mesma garantia de qualquer
      outra tabela do schema).

---

# Fase 7 — Download e conflitos entre dispositivos [INICIADA em 2026-07-30 — mecânica pronta e testada para 2 domínios, não plugada no app]

Implementada em `src/db/sync/downloadRemoteChanges.js`, sobre
`src/firebase/firestore.js#listUserDocsUpdatedSince` (nova consulta por
`updatedAt`, testada mockando o SDK do Firestore) e a tabela `conflict_log`
(migration 002). Testada de ponta a ponta com SQLite real + uma função de
busca injetada simulando o Firestore. Só cobre categorias e lançamentos —
os "casos especiais" abaixo dependem de domínios que ainda não existem em
SQLite (Fase 3).

## Entregas

- [x] Manter cursor da última sincronização por coleção — `sync_state`,
      chave `cursor:<entidade>`.
- [x] Baixar somente registros modificados desde o último cursor —
      `listUserDocsUpdatedSince` (Firestore) + `getCursor` (SQLite).
- [x] Aplicar alterações em transação.
- [x] Implementar regra "alteração mais recente vence" — compara
      `updated_at` local x remoto; local mais novo vence e fica registrado
      como conflito (a edição local ainda reenvia pela fila, Fase 6).
- [x] Detectar relógio incorreto do aparelho — um `updatedAt` remoto além
      de `maxClockSkewMs` no futuro não é aplicado, vira conflito.
- [x] Registrar conflitos relevantes — tabela `conflict_log` (migration 002).
- [x] Criar ferramenta interna para diagnóstico — `listConflictLog(driver, { entidade })`.

## Casos especiais

- [ ] Aportes em metas — depende de `metas` ganhar adapter SQLite (Fase 3).
- [ ] Fechamentos mensais imutáveis — depende de `fechamentos` (Fase 3).
- [ ] Exclusão de categoria ainda utilizada — nenhuma lógica especial
      escrita; hoje a exclusão de categoria é sempre hard delete, local ou
      remota, sem verificar uso.
- [ ] Recorrências editadas em aparelhos diferentes — depende de
      `recorrencias` ganhar adapter SQLite (Fase 3).
- [ ] Importação repetida de extratos — `importLancamentos` ainda não foi
      portado pro adapter SQLite de lançamentos (ver nota na Fase 3).

## Critério de conclusão

- [ ] Dois aparelhos convergem para o mesmo estado — a lógica de convergência
      existe e está testada; só é verificável de ponta a ponta com dois
      dispositivos reais, que não há como simular aqui.
- [x] Conflitos não duplicam dinheiro nem lançamentos — `INSERT OR REPLACE`
      pelo mesmo id nunca duplica linha; testado.

---

# Fase 8 — Google Play Billing [MAJORITARIAMENTE JÁ COBERTA por ROADMAP_MONETIZACAO.txt Fase 9 — ver lá; só 1 gap fechado nesta rodada]

Esta fase se sobrepõe quase inteiramente à Fase 9 de
[ROADMAP_MONETIZACAO.txt](ROADMAP_MONETIZACAO.txt), escrita antes deste
roadmap (18/07/2026) — mesmo backend, mesmo bloqueio: sem Android Studio,
`adb` nem conta Google Play Console neste ambiente, não há como integrar o
plugin nativo de Play Billing nem testar contra uma compra real. Consulte
aquele arquivo pra o detalhamento completo do que já existe
(`validate-android-purchase.js`, `subscriptionWriter.js`).

Nesta rodada (30/07/2026), fechei um gap real que **não** dependia de
Android Studio: o *acknowledgement* da compra (obrigatório em até 3 dias
pela Play Billing Library, senão o Google reembolsa sozinho) estava
marcado como pendente em `subscriptionWriter.js` — implementei em
`netlify/lib/googlePlay.js` (`acknowledgeSubscriptionPurchase`), chamado
por `validate-android-purchase.js` logo após conceder a assinatura
(best-effort: falha ao confirmar não desfaz a assinatura já concedida, só
loga). Testado com `fetch` mockado; o comportamento real do Google Play
contra uma compra já confirmada continua não verificado (precisa de
sandbox). `ROADMAP_MONETIZACAO.txt` atualizado com o mesmo detalhe.

## Objetivo

Vincular uma compra Android validada a uma conta.

## Fluxo

1. Usuário escolhe o Premium.
2. Faz login ou cria uma conta.
3. Inicia compra pelo Google Play Billing.
4. Aplicativo recebe o `purchaseToken`.
5. Backend valida com a Google Play Developer API.
6. Backend vincula compra e `uid`.
7. Backend grava a autorização Premium.
8. Aplicativo ativa sincronização.

## Entregas

- [ ] Integrar biblioteca/plugin de Play Billing — bloqueado: precisa
      escolher e instalar um plugin nativo no projeto Capacitor, e não há
      como compilar/testar isso sem Android Studio.
- [ ] Configurar produto e plano base no Play Console — precisa de conta
      Google Play Console real (taxa única, só o dono do projeto pode criar).
- [ ] Enviar identificador ofuscado da conta na compra — depende do plugin
      nativo acima existir.
- [x] Evoluir `validate-android-purchase` — GET de status (Fase anterior)
      + acknowledgement (novo nesta rodada).
- [x] Validar compra exclusivamente no servidor — já era assim.
- [x] Reconhecer compras — `acknowledgeSubscriptionPurchase`, novo.
- [x] Tratar renovação, cancelamento, carência e suspensão —
      `applyGooglePlaySubscription` (fase anterior), não testado contra API real.
- [ ] Implementar notificações em tempo real da Google Play — (Real-time
      Developer Notifications via Pub/Sub) não implementado; precisa de
      projeto Google Cloud configurado.
- [ ] Restaurar compras — depende do plugin nativo pra obter o purchaseToken
      de uma compra existente no aparelho.

## Critério de conclusão

- [ ] Reinstalar o app e entrar na mesma conta restaura o Premium —
      bloqueado pela integração nativa.
- [x] Compra não validada no servidor não libera sincronização — já era
      verdade (`validate-android-purchase` é o único caminho que escreve
      `plan`/`subscriptionStatus`, via Admin SDK).

---

# Fase 9 — Ativação do backup e primeira mesclagem [INICIADA em 2026-07-30 — as 3 opções testadas para 2 domínios, não plugada no app]

Implementada em `src/db/sync/firstSync.js`, reaproveitando (sem duplicar
lógica) a Fase 5 (download), a Fase 6 (`uploader`) e a Fase 7
(`downloadRemoteChanges`, cujo cursor começa em "época zero" se o aparelho
nunca sincronizou — por isso serve tanto pra sync incremental quanto pra
essa primeira mesclagem). Só cobre categorias e lançamentos. Nada no app
chama isso ainda — falta a tela de ativação do Premium que apresente as 3
opções ao usuário.

## Opções apresentadas

- [x] Enviar dados deste aparelho — `uploadLocalToFirestore`.
- [x] Baixar dados existentes da conta — `downloadAccountData` (mesma
      função da Fase 5, `migrateFromFirestore`, reexportada aqui por nome).
- [x] Mesclar os dois conjuntos — `mergeLocalAndRemote`.

## Entregas

- [x] Mostrar contagens antes da operação — `previewFirstSync` (local,
      remoto, só-local, só-remoto, em-ambos), sem escrever nada.
- [~] Criar backup JSON local — a Fase 5 já retorna os dados buscados em
      `result.backup` antes de escrever; salvar isso como arquivo continua
      responsabilidade de quem chama (mesma decisão da Fase 5).
- [x] Detectar IDs duplicados — trivial por construção: local e remoto
      convergem pelo mesmo id (Fase 2), `previewFirstSync` já conta
      "emAmbos" separado de "só local"/"só remoto".
- [x] Detectar possíveis lançamentos equivalentes —
      `detectPossibleDuplicateLancamentos` (mesmo tipo/valor/data/descrição
      sob ids diferentes); só sinaliza, nunca mescla ou apaga sozinho.
- [x] Enviar em lotes — `uploadLocalToFirestore` já teve essa forma desde
      a Fase 6 (`batchSize`).
- [x] Permitir retomar após falha — upload idempotente (mesmo id sempre),
      chamar de novo depois de uma falha nunca duplica.
- [ ] Confirmar conclusão — falta a tela; a função já retorna um resumo
      pronto pra exibir.

## Critério de conclusão

- [x] Ativar Premium não duplica ou apaga lançamentos — testado (upload
      idempotente por id; merge nunca sobrescreve o que só existe local
      sem primeiro reconciliar via "mais recente vence" da Fase 7).
- [x] O processo pode ser interrompido e retomado — mesma garantia de
      idempotência; chamar de novo depois de uma falha é seguro.

---

# Fase 10 — Web exclusiva para Premium [INICIADA em 2026-07-30]

**Decisão de produto (30/07/2026, confirmada com o dono do projeto):** esta
fase contradizia `ROADMAP_MONETIZACAO.txt`, que lista "Acesso Web e
Android" como benefício do Plano Gratuito. Decisão: seguir esta Fase 10 —
a tabela do plano Gratuito em `ROADMAP_MONETIZACAO.txt` está desatualizada
nesse ponto (sinalizado lá).

Implementada em `src/routes/webPremiumGate.js` (regra pura, testada),
`RequirePremiumWeb.jsx` (rota-layout) e `AcessoWebPage.jsx`. Respeita o
mesmo `PREMIUM_ENFORCED` que já controla todo o resto do gating do
projeto — hoje `false`, então **nada muda pra ninguém ainda**; o
bloqueio de verdade só passa a valer quando o dono do projeto ligar essa
chave (a mesma que já segura os limites de categorias/recorrências/etc).
Verificado no navegador (app carrega e resolve a árvore de rotas
normalmente com a nova estrutura aninhada).

## Entregas

- [x] Manter login obrigatório na web — já valia antes desta fase
      (`ProtectedRoute`), inalterado.
- [x] Criar rota de verificação Premium antes do aplicativo —
      `RequirePremiumWeb` como rota-layout em `AppRoutes.jsx`, em volta só
      dos módulos financeiros (`/opcoes`, `/opcoes/meu-plano` e
      `/acesso-web` ficam fora, senão ninguém sem Premium conseguiria
      chegar na tela de assinatura).
- [x] Bloquear módulos financeiros para contas não Premium — Dashboard,
      Lançamentos, Categorias, Relatórios, Metas, Gestor, Planejamento,
      Busca, Valor Livre.
- [x] Criar página "Acesso web incluído no Premium" — `AcessoWebPage.jsx`.
- [x] Permitir recuperação de sessão — já coberto pela persistência
      própria do Firebase Auth, nada novo necessário.
- [x] Exibir estado de assinatura expirada — `AcessoWebPage` diferencia
      "nunca assinou" de "expirado/cancelado/em atraso".
- [x] Remover checkout externo do build Android — `Paywall.jsx`: em
      `Capacitor.isNativePlatform()`, nunca chama o checkout Web do
      MercadoPago (só Google Play Billing pode cobrar no Android, ainda
      não integrado — misturar os dois violaria a política de pagamentos
      da Play Store).
- [~] Separar configurações por plataforma — feito onde havia algo
      concreto pra separar (o checkout acima); não criei configuração nova
      especulativa além disso.

## Critério de conclusão

- [x] Usuário gratuito Android não acessa dados pela web — não se aplica:
      o bloqueio é da Web pra quem não é Premium, independente de
      plataforma onde a conta foi criada; Android nunca é bloqueado
      (`Capacitor.isNativePlatform()` sempre libera).
- [x] Assinante entra na web e vê os mesmos dados sincronizados — já
      valia (mesmo Firestore, mesma conta); esta fase só adiciona a
      restrição de acesso, não mexeu em como os dados são carregados.
- [x] Assinatura expirada bloqueia a web sem apagar dados — o bloqueio é
      só de rota/UI; nenhum dado é tocado.

---

# Fase 11 — Cancelamento, downgrade e retenção [INICIADA em 2026-07-30]

Implementada em `src/db/sync/syncPolicy.js` (`canSync`), `runSyncCycle.js`
(orquestrador + última sincronização) e `retention.js` (data de exclusão),
mais `deleteCloudCopyOnly` em `dataPortabilityService.js`. Tudo testado.

## Entregas

- [x] Pausar uploads após expiração — `canSync({ isPremium, isOnline })`;
      `runSyncCycle` recusa rodar (`skipped: true`) quando `false`.
- [x] Manter dados locais acessíveis — já garantido desde a Fase 3 (SQLite
      não depende do Firebase pra ler/gravar).
- [x] Mostrar data da última sincronização — `getLastSyncAt(driver, entidade)`;
      falta a tela que exibe isso.
- [x] Informar prazo de retenção da nuvem — `cloudDeletionDate(currentPeriodEndIso)`,
      90 dias por padrão (FASE0_DECISOES.md); atualizado também em
      `PrivacidadePage.jsx`.
- [x] Permitir renovação e retomada — consequência direta de `canSync`:
      assim que `isPremium` volta a `true`, o próximo ciclo roda normal;
      nada precisa ser recriado (upload/download continuam idempotentes).
- [~] Permitir exclusão antecipada da cópia remota — `deleteCloudCopyOnly(uid)`
      existe e está testado (apaga só o Firestore, mantém a conta e a
      assinatura intactas), mas **de propósito não exponho isso na UI
      ainda**: hoje `repositories/provider.js` sempre usa Firebase — SQLite
      não é a fonte ativa (Fase 3/4 incompletas) — então "apagar a cópia
      remota mantendo os dados locais" hoje apagaria os únicos dados que o
      app realmente usa. Botão fica pra quando o SQLite estiver ativo.
- [ ] Criar rotina de limpeza após o prazo definido — não implementado;
      precisa de um job agendado (Cloud Scheduler/Netlify scheduled
      function) rodando `deleteCloudCopyOnly` para contas passadas do
      prazo, infraestrutura que não existe neste ambiente.

## Critério de conclusão

- [x] Cancelar Premium nunca bloqueia o Android local — `canSync` só
      pausa a nuvem, nunca a leitura/escrita local.
- [x] Renovar retoma a sincronização sem recriar dados — testado
      (`syncPolicy.test.js`); upload/download continuam idempotentes por id.

---

# Fase 12 — Segurança e conformidade [INICIADA em 2026-07-30 — só os itens que não dependem de Android Studio/Play Console/GCP]

## Entregas

- [ ] Ativar Firebase App Check com Play Integrity — bloqueado: exige
      projeto Android nativo (Play Integrity é uma API do Google Play em
      si) e Firebase Console, nenhum acessível aqui.
- [x] Revisar regras do Firestore para o modelo sincronizado — revisado E
      testado contra o emulador real (`npm run test:rules:emulator`, Java
      17 disponível neste ambiente): as regras já usam `isOwner(uid)` sem
      restringir nomes de campo nas coleções gerais, então os metadados da
      Fase 2 (`deviceId`, `syncStatus`, `localVersion`, `deletedAt`) passam
      sem precisar de nenhuma mudança. Novo teste adicionado em
      `tests/firestore.rules.spec.mjs` confirmando isso (9/9 passando).
- [x] Não confiar em `premium=true` vindo do cliente — já valia
      (ROADMAP_MONETIZACAO.txt: só Admin SDK escreve `plan`/`subscriptionStatus`).
- [ ] Criptografar credenciais e tokens locais — avaliação de SQLCipher
      pendente; não implementado às cegas sem poder testar num Android real.
- [ ] Avaliar proteção do SQLite em repouso — mesma pendência acima.
- [ ] Bloquear capturas de tela em páginas sensíveis — recurso nativo
      Android (`FLAG_SECURE`); bloqueado sem Android Studio.
- [x] Atualizar política de privacidade e termos — `PrivacidadePage.jsx`:
      menciona o `deviceId` técnico (Fase 2) e formaliza a retenção de 90
      dias da cópia na nuvem após cancelamento (Fase 0/11). Continua
      rascunho, precisa de revisão jurídica (nota já existente, inalterada).
- [ ] Preencher a seção Segurança de dados da Play Store — preenchido no
      Play Console em si, que não existe neste ambiente.
- [x] Documentar exclusão de conta e dados — já coberto (`OpcoesPage.jsx`
      + `PrivacidadePage.jsx`, seção 5); `deleteCloudCopyOnly` documentado
      na Fase 11 acima.
- [ ] Criar alertas de custos e orçamento no Google Cloud — exige acesso
      ao Google Cloud Console.

## Critério de conclusão

- [x] Testes confirmam isolamento entre usuários — já coberto por
      `tests/firestore.rules.spec.mjs` ("allows the owner and denies
      another user"), rodando de verdade contra o emulador.
- [x] O cliente não consegue conceder Premium a si mesmo — regras do
      Firestore bloqueiam qualquer `update`/`create` de assinatura fora da
      transição inicial exata permitida; testado no mesmo arquivo.
- [~] Dados locais e remotos podem ser apagados separadamente —
      `deleteCloudCopyOnly` (apaga só o Firestore) existe e está testado,
      mas ainda não exposto na UI (motivo explicado na Fase 11: os botões
      "Zerar" de Opções ainda apontam pro Firebase, porque o SQLite ainda
      não é a fonte ativa — só passam a apagar de fato "só o local" depois
      que o provider trocar).

---

# Fase 13 — Observabilidade e controle de custos [INICIADA em 2026-07-30 — só métricas locais/por-aparelho]

Implementada em `src/db/sync/syncHealth.js` (`getSyncHealth`), reaproveitando
`countPending` (Fase 6), `listConflictLog` (Fase 7) e `getLastSyncAt`
(Fase 11). Testado. As métricas abaixo marcadas `[ ]` são agregadas entre
todos os usuários — dependem de Firebase Analytics/BigQuery/GCP Console,
nenhum acessível neste ambiente; as marcadas `[x]` são por-aparelho e
já existem em código.

## Métricas

- [ ] Usuários gratuitos locais — agregado, depende de Analytics.
- [ ] Usuários Premium ativos — idem.
- [ ] Leituras e gravações por assinante — idem (Firebase usage/BigQuery).
- [ ] Bytes sincronizados — não instrumentado.
- [x] Tamanho médio da fila — `getSyncHealth().filaPendente`, por aparelho.
- [ ] Tempo médio de sincronização — não instrumentado (precisaria medir
      duração de `runSyncCycle`, fácil de adicionar depois, não feito
      agora pra não medir algo que ainda não roda de verdade no app).
- [x] Taxa de erro e conflito — `getSyncHealth().conflitosRecentes`
      (`conflict_log`, Fase 7) e `sync_queue.tentativas`/`status='error'`
      (Fase 6), por aparelho.
- [ ] Custo Firebase por assinante — depende do Firebase Console.
- [ ] Conversão gratuito → Premium — já instrumentado como evento de
      analytics (ROADMAP_MONETIZACAO.txt, Fase 10); calcular a métrica em
      si depende do GA4/BigQuery.
- [ ] Cancelamentos e recuperação de assinatura — idem.

## Alertas

- [ ] Orçamento mensal do Google Cloud — exige GCP Console.
- [ ] Pico anormal de leituras — exige Firebase Console/monitoring.
- [ ] Falhas de validação de compra — já logadas em `subscription_log`
      (ROADMAP_MONETIZACAO.txt); um alerta de verdade sobre isso (e-mail/
      Slack) não foi criado, exige um canal de notificação configurado.
- [x] Crescimento da fila de sincronização — dá pra observar via
      `getSyncHealth().filaPendente` ao longo do tempo; não há um alerta
      automático dedicado, só o número exposto.
- [ ] Erros de regras do Firestore — exige Firebase Console/Cloud Logging.

## Critério de conclusão

- [ ] É possível calcular custo e receita por assinante — depende das
      métricas agregadas acima, todas bloqueadas por acesso externo.

---

# Fase 14 — Testes para lançamento [AUDITADA em 2026-07-30 — mapeamento cenário → cobertura, sem código novo]

Nenhum destes cenários pode ser executado de ponta a ponta neste ambiente
(exige Android real, multi-dispositivo, ou contas de pagamento reais).
Este mapeamento é honesto sobre o que já tem teste automatizado
equivalente na lógica, e o que só um dispositivo real confirma.

## Cenários obrigatórios

- [ ] Primeira abertura sem internet — bloqueado: depende da Fase 4
      (modo sem conta) estar de pé num dispositivo real.
- [ ] Uso gratuito sem conta — idem.
- [~] Fechar e reabrir o aplicativo offline — a persistência em si é
      testada (`migrationRunner.test.js`: aplicar migrations é idempotente
      após "reabrir" um banco já existente); fechar/reabrir o app de
      verdade só um dispositivo confirma.
- [~] Assinar com dados locais existentes — lógica testada
      (`firstSync.test.js`: preview, upload, merge); falta a tela que
      dispara isso e um teste manual do fluxo completo.
- [x] Falha de internet durante upload inicial — testado
      (`processSyncQueue.test.js`: falha fica pendente com backoff, não
      se perde).
- [x] Dois aparelhos editando o mesmo lançamento — testado
      (`downloadRemoteChanges.test.js`: "mais recente vence", conflito logado).
- [ ] Exclusão offline — parcial: `remove()` local ainda é hard delete
      (soft-delete com `deletedAt` é da Fase 6, não implementado); sem
      isso, uma exclusão feita offline não tem como ser propagada pela
      fila de sincronização ainda.
- [~] Cancelamento e expiração — `subscriptionState.test.js` (já existia,
      ROADMAP_MONETIZACAO.txt) cobre a lógica de status; `syncPolicy.test.js`
      cobre a pausa de sync; fluxo completo não testado num app real.
- [x] Renovação — `syncPolicy.test.js` ("allows syncing only when both
      Premium and online" cobre a retomada).
- [ ] Troca de celular — bloqueado: precisa de dois dispositivos reais.
- [ ] Reinstalação — bloqueado: precisa de dispositivo real.
- [ ] Restauração de compra — bloqueado: depende do Google Play Billing
      (ROADMAP_MONETIZACAO.txt, Fase 9), não integrado.
- [x] Login web Premium — testado (`webPremiumGate.test.js`).
- [x] Bloqueio web não Premium — testado (`webPremiumGate.test.js`).
- [x] Exclusão completa da conta — testado (`dataPortabilityService.test.js`).
- [x] Migração de usuário antigo — testado (`migrateFromFirestore.test.js`).

## Critério de conclusão

- [~] Nenhum cenário causa perda ou duplicação financeira — verdadeiro
      para todo cenário testável em lógica (marcado `[x]`/`[~]` acima);
      os `[ ]` dependem de teste manual num dispositivo/conta real antes
      do lançamento.

---

# Sequência recomendada de entregas

## Marco 1 — Base local

Fases 0 a 4.

Resultado: Android gratuito funciona sem conta e sem Firebase.

## Marco 2 — Migração e sincronização

Fases 5 a 7.

Resultado: usuário existente ou Premium sincroniza com segurança.

## Marco 3 — Monetização

Fases 8 a 11.

Resultado: compra Android libera nuvem e web.

## Marco 4 — Publicação

Fases 12 a 14.

Resultado: versão preparada para testes fechados na Play Store.

---

# Estimativa inicial

| Bloco | Estimativa |
|---|---:|
| Repositórios e identidade local | 4–7 dias |
| SQLite e migrações | 5–8 dias |
| Modo gratuito sem conta | 3–5 dias |
| Migração de usuários atuais | 3–5 dias |
| Sincronização e conflitos | 7–12 dias |
| Play Billing e backend | 5–8 dias |
| Web Premium e downgrade | 3–5 dias |
| Segurança, testes e publicação | 5–8 dias |

Estimativa total inicial: **35–58 dias de desenvolvimento**, dependendo da
complexidade encontrada nos testes de sincronização e na integração de cobrança.

---

# Próxima ação recomendada

Começar pela **Fase 1 — Camada de repositórios**.

Ela reduz o risco das fases seguintes e pode ser entregue sem mudar o
comportamento atual do aplicativo. Depois, migrar primeiro **Categorias** e
**Lançamentos** para SQLite, pois esses dois recursos validam praticamente
todos os requisitos do modelo local-first.
