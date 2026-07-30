# Recuperação de migração e sincronização

## Regra principal

Nunca apagar a origem automaticamente. Antes de reparar, exportar o diagnóstico,
preservar o SQLite e gerar backup JSON da nuvem.

## Migração interrompida

1. Não marcar a migração manualmente como concluída.
2. Conferir `migration:firestore:*` em `sync_state`.
3. Se a transação falhou, confirmar que não há dados parciais.
4. Corrigir a causa e executar novamente com a mesma versão.
5. Usar `force` somente depois de comparar contagens e somatórios.

## Fila sem avançar

1. Exportar o diagnóstico pela página interna.
2. Conferir Premium, conexão e última sincronização.
3. Revisar operações em `error` e a mensagem registrada.
4. Corrigir erros permanentes antes de usar `retryFailed`.
5. Nunca remover manualmente uma operação sem confirmar o estado remoto.

## Divergência entre aparelhos

1. Pausar novas edições em ambos.
2. Exportar diagnóstico e backup dos dois aparelhos.
3. Consultar `conflict_log`.
4. Comparar `id`, `updatedAt`, `deviceId`, `localVersion` e `deletedAt`.
5. Aplicar a política “mais recente vence”, exceto casos especiais documentados.
6. Retomar um aparelho por vez e confirmar convergência.

## Exclusão acidental

- Tombstone presente: não fazer hard delete; restaurar com nova versão e timestamp.
- Nuvem removida pela retenção: usar o aparelho local e reativar backup.
- SQLite perdido sem backup Premium: documentar que não existe origem recuperável.

## Escalonamento

Bloquear lançamento se houver diferença financeira, duplicação, fila descartada,
backup ausente ou conflito que não possa ser explicado pelos registros de auditoria.
