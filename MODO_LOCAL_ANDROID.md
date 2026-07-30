# Modo local no Android

## Funcionamento

No Android, `initializeRepositories()` abre `contafechada`, executa as
migrations versionadas e seleciona os repositórios SQLite. A Web continua
usando Firebase. “Continuar gratuitamente sem conta” cria somente uma sessão
local; não cria identidade anônima no Firebase.

Os dez domínios são persistidos em `local_documents`. Cada alteração registra
versão, aparelho, estado de sincronização e uma operação em `sync_queue`.
Exclusões permanecem como tombstones até confirmação da nuvem.

## Login depois do uso local

Entrar com Google não apaga o banco. Quando há dados locais, o aplicativo
apresenta três opções:

- enviar os dados do aparelho;
- baixar os dados da conta;
- mesclar, mantendo o registro mais recente por `updatedAt`.

Antes da operação, um snapshot é persistido em `sync_state`. O estado também
fica no SQLite, separado por UID, permitindo retomada após interrupção.

## Exportação e importação

Em Opções, uma sessão local pode exportar os dados ativos para JSON. A
importação valida a estrutura e o limite de 100.000 registros, guarda um
snapshot interno e substitui documentos e fila numa única transação.

## Integridade e recuperação

A abertura executa `PRAGMA quick_check`. Migration interrompida sofre rollback
e pode ser repetida. Em falha, nada é apagado automaticamente: primeiro é
oferecida uma nova tentativa. “Recriar banco” é separado, exige confirmação
explícita e deve ser usado somente se a abertura continuar falhando.

## Cobertura automatizada

Os testes usam SQLite real e cobrem os dez contratos, tombstones, fila,
recorrências, onboarding, importações, primeira sincronização, convergência
e reabertura de um banco em arquivo sem rede.

O ciclo incremental roda ao abrir o app, voltar ao primeiro plano, recuperar
conectividade e a cada cinco minutos. Uma trava impede ciclos concorrentes.
Uploads confirmados atualizam `sync_status`; tombstones confirmados são
removidos. A rota `/opcoes/diagnostico` mostra fila, erros, métricas e
conflitos e permite exportar um relatório.

## Validação ainda necessária

Em aparelho ou emulador:

- criar dados em modo avião e reabrir;
- interromper uma migration e a primeira sincronização;
- testar enviar, baixar e mesclar com Firebase real;
- exportar e reimportar um backup;
- validar atualização e reinstalação.

## Checklist automatizado

`npm run check:prelaunch` executa testes, builds Web/Android, auditoria do
bundle, sincronização Capacitor e restaura o build Web. A variante
`npm run check:prelaunch:rules` também valida as regras do Firestore e
reutiliza um emulador já ativo na porta 8080 quando disponível.
