# Testes manuais — local-first, Premium e lançamento

Execute em ambiente de desenvolvimento, com contas e dados descartáveis.
Registre aparelho, versão do app, conta, horário, resultado e evidência de
cada cenário. Nunca use a produção para testes destrutivos.

## Preparação

- Um Android com instalação limpa e outro Android com a mesma conta Premium.
- Rede que possa ser desligada sem encerrar o app.
- Conta gratuita, conta Premium ativa e conta expirada.
- Dados de teste com valores conhecidos e backup JSON antes de começar.
- Firebase de desenvolvimento separado e produto de teste da Play Store.

## Base local

- [ ] Abrir instalação nova sem internet e escolher uso gratuito.
- [ ] Criar, editar e excluir lançamento, categoria, meta e recorrência sem conta.
- [ ] Fechar o app à força, reabrir offline e conferir todos os dados.
- [ ] Reiniciar o aparelho e conferir persistência.
- [ ] Exportar JSON, apagar dados locais, importar e comparar contagens/somatórios.
- [ ] Desinstalar e confirmar que o aviso de perda local havia sido apresentado.

## Migração de usuário existente

- [ ] Entrar numa conta antiga com dados no Firestore.
- [ ] Conferir backup gerado antes da cópia.
- [ ] Comparar contagens e somatórios antes/depois.
- [ ] Interromper durante a migração e confirmar rollback completo.
- [ ] Repetir a migração e confirmar ausência de duplicatas.
- [ ] Confirmar que a origem remota não foi apagada.

## Sincronização e conflitos

- [ ] Criar e editar offline; reconectar e confirmar upload.
- [ ] Fechar o app com fila pendente; reabrir e confirmar que a fila permanece.
- [ ] Derrubar a rede durante lote e confirmar retry sem duplicação.
- [ ] Editar o mesmo lançamento nos dois aparelhos e validar “mais recente vence”.
- [ ] Excluir offline e confirmar exclusão lógica no outro aparelho.
- [ ] Alterar o relógio do aparelho e conferir registro de conflito.
- [ ] Repetir importação do mesmo extrato e confirmar idempotência.

## Premium e primeira sincronização

- [ ] Ativar Premium escolhendo “enviar”, “baixar” e “mesclar” em contas separadas.
- [ ] Conferir preview e possíveis duplicatas antes da operação.
- [ ] Interromper cada opção e retomar.
- [ ] Cancelar/expirar e confirmar que o Android local continua utilizável.
- [ ] Renovar e confirmar retomada da fila.
- [ ] Solicitar exclusão antecipada da nuvem e confirmar dados locais intactos.

## Google Play e Web

- [ ] Comprar com conta de teste, validar no servidor e confirmar acknowledgement.
- [ ] Configurar push RTDN para `/api/google-play-rtdn` com autenticação OIDC.
- [ ] Disparar renovação/cancelamento no sandbox e confirmar atualização pelo RTDN.
- [ ] Reenviar a mesma mensagem Pub/Sub e confirmar atualização idempotente.
- [ ] Enviar token OIDC, `packageName` e `purchaseToken` inválidos e confirmar rejeição.
- [ ] Testar renovação, cancelamento, carência e suspensão.
- [ ] Reinstalar e restaurar compra na mesma conta.
- [ ] Confirmar que Web bloqueia conta gratuita/expirada e libera Premium.
- [ ] Confirmar que o checkout Mercado Pago nunca abre dentro do Android.

## Segurança e retenção

- [ ] Tentar ler/escrever dados de outro `uid`.
- [ ] Tentar conceder Premium pelo cliente.
- [ ] Rodar limpeza de retenção em `dryRun` e revisar elegíveis.
- [ ] Rodar limpeza real em conta vencida há mais de 90 dias.
- [ ] Confirmar preservação de Auth, assinatura e `subscription_log`.
- [ ] Confirmar exclusão somente das coleções financeiras e configuração.

## Critério de aprovação

Nenhum cenário pode perder ou duplicar valor financeiro. Falhas devem manter
backup, fila e estado retomável. Todo resultado diferente bloqueia o lançamento.
