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

# Fase 0 — Preparação e decisões

## Entregas

- Definir prazo de retenção dos dados na nuvem após cancelamento.
- Definir período de tolerância offline do Premium.
- Definir política de conflito entre aparelhos.
- Definir quais funções pertencem ao gratuito e ao Premium.
- Criar ambientes Firebase separados para desenvolvimento e produção.
- Registrar métricas atuais de leituras, gravações e usuários ativos.

## Decisões recomendadas

- Retenção após cancelamento: **90 dias**.
- Tolerância Premium offline: **7 dias**.
- Conflito inicial: **alteração mais recente vence**.
- Exportação manual: disponível para todos.
- Sincronização e web: exclusivas do Premium.

## Critério de conclusão

- Regras comerciais, técnicas e de retenção documentadas.

---

# Fase 1 — Camada de repositórios

## Objetivo

Impedir que as telas conheçam diretamente o Firestore ou o SQLite.

## Entregas

- Criar contratos para:
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
- Adaptar os serviços Firebase atuais para implementar esses contratos.
- Criar um provedor que selecione o repositório conforme a plataforma.
- Remover chamadas diretas ao Firestore das páginas e componentes.

## Exemplo

```js
const lancamentos = repositories.lancamentos;

await lancamentos.listByMonth(monthKey);
await lancamentos.create(data);
await lancamentos.update(id, data);
await lancamentos.remove(id);
```

## Critério de conclusão

- Todas as telas continuam funcionando com Firebase por meio dos repositórios.
- Nenhuma regra de negócio depende diretamente do SDK do Firestore.
- Testes existentes continuam aprovados.

---

# Fase 2 — Identidade local e IDs universais

## Objetivo

Permitir criação de dados sem conta e garantir que sejam sincronizáveis depois.

## Entregas

- Gerar e persistir um `deviceId`.
- Usar UUID nos novos registros.
- Acrescentar metadados locais:

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

- Garantir que importações e recorrências sejam idempotentes.
- Padronizar datas em UTC para metadados de sincronização.
- Manter datas financeiras no formato local já usado pelo produto.

## Estados de sincronização

- `local`: nunca enviado.
- `pending`: aguardando envio.
- `syncing`: envio em andamento.
- `synced`: confirmado pela nuvem.
- `conflict`: requer resolução.
- `error`: falha persistente.

## Critério de conclusão

- Registros podem ser criados sem `uid`.
- IDs locais não colidem com IDs vindos da nuvem.

---

# Fase 3 — Banco SQLite no Android

## Objetivo

Tornar o SQLite a fonte principal da versão Android.

## Entregas

- Adicionar integração SQLite compatível com Capacitor.
- Criar migrations versionadas do banco.
- Criar tabelas e índices para consultas frequentes.
- Implementar transações para operações em lote.
- Criar adaptadores SQLite para os repositórios.
- Manter IndexedDB apenas para a versão web.

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

- Todos os módulos Android funcionam em modo avião após fechar e reabrir o app.
- Criar, editar e excluir dados não requer Firebase.
- Testes cobrem atualização de schema e recuperação após interrupção.

---

# Fase 4 — Modo gratuito sem conta

## Objetivo

Permitir uso completo do núcleo financeiro sem autenticação.

## Entregas

- Alterar o fluxo inicial:
  - “Continuar gratuitamente”;
  - “Entrar na minha conta”.
- Remover `ProtectedRoute` do modo local Android.
- Criar uma sessão local independente do Firebase Auth.
- Adaptar onboarding para explicar o armazenamento no aparelho.
- Adicionar avisos sobre desinstalação e perda do dispositivo.
- Disponibilizar exportação e importação local.
- Adicionar “Apagar dados deste aparelho”.

## Critério de conclusão

- Uma instalação nova cria lançamentos sem internet e sem conta.
- O usuário entende que o plano gratuito não possui backup automático.

---

# Fase 5 — Migração segura dos dados atuais

## Objetivo

Copiar dados já existentes no Firestore para o SQLite sem perdas.

## Fluxo

1. Detectar usuário existente autenticado.
2. Verificar se a migração local já foi concluída.
3. Baixar todas as coleções do usuário.
4. Validar quantidade e somatórios.
5. Gravar tudo em uma transação SQLite.
6. Comparar origem e destino.
7. Marcar a migração como concluída.
8. Manter os dados na nuvem.

## Proteções

- Nunca apagar a origem automaticamente.
- Criar backup JSON antes da migração.
- Permitir repetir a migração.
- Registrar versão e data da migração.
- Mostrar resumo ao usuário.

## Critério de conclusão

- Contagens e valores financeiros coincidem antes e depois da migração.
- Interromper o app no meio da migração não deixa dados parciais.

---

# Fase 6 — Fila de sincronização Premium

## Objetivo

Enviar alterações locais com segurança quando houver Premium e internet.

## Entregas

- Implementar tabela `sync_queue`.
- Registrar operações de criação, edição e exclusão.
- Enviar operações em lotes.
- Aplicar retry com espera progressiva.
- Usar chaves idempotentes.
- Criar exclusões lógicas com `deletedAt`.
- Mostrar quantidade de operações pendentes.
- Pausar sincronização sem internet ou sem Premium.

## Regras

- A interface nunca espera a nuvem para salvar.
- Uma operação só sai da fila após confirmação.
- Repetir uma operação não cria documentos duplicados.
- Operações do mesmo registro podem ser consolidadas.

## Critério de conclusão

- Alterações feitas offline chegam à nuvem quando a conexão retorna.
- Fechar o aplicativo não perde a fila.

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
