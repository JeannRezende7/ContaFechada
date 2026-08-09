# Auditoria de segurança — Netlify Functions

Revisão local em 2026-07-30. Nenhum endpoint foi publicado nesta auditoria.

| Endpoint | Autenticação | Validação/estado | Resultado |
|---|---|---|---|
| `create-checkout` | Firebase ID token | plano permitido e estado confirmado pelo Mercado Pago | adequado |
| `cancel-subscription` | Firebase ID token | cancela somente assinatura do próprio `uid` | adequado |
| `validate-android-purchase` | Firebase ID token | reconsulta Developer API; não confia no APK | adequado, falta sandbox |
| `delete-private-user-data` | Firebase ID token | usa `uid` verificado | adequado |
| `mercadopago-webhook` | assinatura do webhook | reconsulta API antes de gravar | adequado |
| `google-play-rtdn` | OIDC, audiência e e-mail | reconsulta Developer API; resposta não expõe `uid` | adequado, falta Pub/Sub real |
| `cleanup-expired-cloud-data` | agendador ou secret manual | janela de 90 dias, status inativo, relatório de auditoria | adequado, validar Netlify real |
| `admin-subscriptions` | Firebase ID token + custom claim `admin` | valida ação, conta e duração; registra ator | adequado, falta validar com projeto real |

## Melhorias aplicadas

- Comparação constante do secret da retenção.
- Erros internos não são devolvidos ao cliente.
- Handlers com dependências injetáveis e testes HTTP.
- RTDN retorna somente `messageId`, nunca conta ou assinatura.
- Relatórios de retenção persistem apenas contagens, sem UIDs.
- Lista única de coleções financeiras para exportação e exclusão.
- Operações administrativas protegidas no servidor e registradas em log; a rota web, sozinha, não concede acesso.
- Endpoint administrativo limita corpo a 4 KiB e identificadores; RTDN limita
  envelope Pub/Sub a 256 KiB antes do parse.
- Painel administrativo é eliminado do build Android em tempo de compilação
  e a auditoria do bundle falha se encontrar sua rota ou título.

## Pendências externas

- Rate limiting/WAF no provedor.
- Rotação e escopo mínimo das service accounts.
- Testes reais de assinatura Mercado Pago, Pub/Sub OIDC e Google Play.
- App Check nos endpoints acionados pelo aplicativo.
- Monitoramento de respostas 401/403/5xx e alertas operacionais.
