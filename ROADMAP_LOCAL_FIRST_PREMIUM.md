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

# Fase 7 — Download e conflitos entre dispositivos

## Objetivo

Trazer alterações remotas para o SQLite local.

## Entregas

- Manter cursor da última sincronização por coleção.
- Baixar somente registros modificados desde o último cursor.
- Aplicar alterações em transação.
- Implementar regra “alteração mais recente vence”.
- Detectar relógio incorreto do aparelho.
- Registrar conflitos relevantes.
- Criar ferramenta interna para diagnóstico.

## Casos especiais

- Aportes em metas.
- Fechamentos mensais imutáveis.
- Exclusão de categoria ainda utilizada.
- Recorrências editadas em aparelhos diferentes.
- Importação repetida de extratos.

## Critério de conclusão

- Dois aparelhos convergem para o mesmo estado.
- Conflitos não duplicam dinheiro nem lançamentos.

---

# Fase 8 — Google Play Billing

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

- Integrar biblioteca/plugin de Play Billing.
- Configurar produto e plano base no Play Console.
- Enviar identificador ofuscado da conta na compra.
- Evoluir `validate-android-purchase`.
- Validar compra exclusivamente no servidor.
- Reconhecer compras.
- Tratar renovação, cancelamento, carência e suspensão.
- Implementar notificações em tempo real da Google Play.
- Restaurar compras.

## Critério de conclusão

- Reinstalar o app e entrar na mesma conta restaura o Premium.
- Compra não validada no servidor não libera sincronização.

---

# Fase 9 — Ativação do backup e primeira mesclagem

## Objetivo

Transformar dados locais em dados sincronizados ao assinar.

## Opções apresentadas

- Enviar dados deste aparelho.
- Baixar dados existentes da conta.
- Mesclar os dois conjuntos.

## Entregas

- Mostrar contagens antes da operação.
- Criar backup JSON local.
- Detectar IDs duplicados.
- Detectar possíveis lançamentos equivalentes.
- Enviar em lotes.
- Permitir retomar após falha.
- Confirmar conclusão.

## Critério de conclusão

- Ativar Premium não duplica ou apaga lançamentos.
- O processo pode ser interrompido e retomado.

---

# Fase 10 — Web exclusiva para Premium

## Objetivo

Permitir acesso web somente para contas com assinatura ativa.

## Entregas

- Manter login obrigatório na web.
- Criar rota de verificação Premium antes do aplicativo.
- Bloquear módulos financeiros para contas não Premium.
- Criar página “Acesso web incluído no Premium”.
- Permitir recuperação de sessão.
- Exibir estado de assinatura expirada.
- Remover checkout externo do build Android.
- Separar configurações por plataforma.

## Critério de conclusão

- Usuário gratuito Android não acessa dados pela web.
- Assinante entra na web e vê os mesmos dados sincronizados.
- Assinatura expirada bloqueia a web sem apagar dados.

---

# Fase 11 — Cancelamento, downgrade e retenção

## Objetivo

Garantir continuidade local e tratamento transparente da nuvem.

## Entregas

- Pausar uploads após expiração.
- Manter dados locais acessíveis.
- Mostrar data da última sincronização.
- Informar prazo de retenção da nuvem.
- Permitir renovação e retomada.
- Permitir exclusão antecipada da cópia remota.
- Criar rotina de limpeza após o prazo definido.

## Critério de conclusão

- Cancelar Premium nunca bloqueia o Android local.
- Renovar retoma a sincronização sem recriar dados.

---

# Fase 12 — Segurança e conformidade

## Entregas

- Ativar Firebase App Check com Play Integrity.
- Revisar regras do Firestore para o modelo sincronizado.
- Não confiar em `premium=true` vindo do cliente.
- Criptografar credenciais e tokens locais.
- Avaliar proteção do SQLite em repouso.
- Bloquear capturas de tela em páginas sensíveis, se desejado.
- Atualizar política de privacidade e termos.
- Preencher a seção Segurança de dados da Play Store.
- Documentar exclusão de conta e dados.
- Criar alertas de custos e orçamento no Google Cloud.

## Critério de conclusão

- Testes confirmam isolamento entre usuários.
- O cliente não consegue conceder Premium a si mesmo.
- Dados locais e remotos podem ser apagados separadamente.

---

# Fase 13 — Observabilidade e controle de custos

## Métricas

- Usuários gratuitos locais.
- Usuários Premium ativos.
- Leituras e gravações por assinante.
- Bytes sincronizados.
- Tamanho médio da fila.
- Tempo médio de sincronização.
- Taxa de erro e conflito.
- Custo Firebase por assinante.
- Conversão gratuito → Premium.
- Cancelamentos e recuperação de assinatura.

## Alertas

- Orçamento mensal do Google Cloud.
- Pico anormal de leituras.
- Falhas de validação de compra.
- Crescimento da fila de sincronização.
- Erros de regras do Firestore.

## Critério de conclusão

- É possível calcular custo e receita por assinante.

---

# Fase 14 — Testes para lançamento

## Cenários obrigatórios

- Primeira abertura sem internet.
- Uso gratuito sem conta.
- Fechar e reabrir o aplicativo offline.
- Assinar com dados locais existentes.
- Falha de internet durante upload inicial.
- Dois aparelhos editando o mesmo lançamento.
- Exclusão offline.
- Cancelamento e expiração.
- Renovação.
- Troca de celular.
- Reinstalação.
- Restauração de compra.
- Login web Premium.
- Bloqueio web não Premium.
- Exclusão completa da conta.
- Migração de usuário antigo.

## Critério de conclusão

- Nenhum cenário causa perda ou duplicação financeira.

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
