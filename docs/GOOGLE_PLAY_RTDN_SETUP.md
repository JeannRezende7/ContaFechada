# Configuração — Google Play Real-time Developer Notifications

O backend está preparado em `/api/google-play-rtdn`, mas nada é publicado ou
configurado automaticamente.

## Variáveis no Netlify

- `ANDROID_PACKAGE_NAME`: `com.contafechada.app`.
- `GOOGLE_PLAY_SERVICE_ACCOUNT`: JSON da conta com acesso à Android Publisher API.
- `GOOGLE_PUBSUB_AUDIENCE`: URL pública exata do endpoint RTDN.
- `GOOGLE_PUBSUB_SERVICE_ACCOUNT_EMAIL`: conta usada para assinar o push OIDC.

## Google Cloud / Play Console

1. Criar tópico Pub/Sub dedicado às notificações da Play.
2. Dar ao serviço da Google Play permissão para publicar no tópico.
3. Vincular o tópico nas configurações de monetização do Play Console.
4. Criar assinatura push apontando para `/api/google-play-rtdn`.
5. Ativar autenticação OIDC usando a conta definida acima.
6. Usar a URL do endpoint como audiência e em `GOOGLE_PUBSUB_AUDIENCE`.

## Validação

1. Fazer compra de teste e validar primeiro por `validate-android-purchase`.
2. Confirmar que `subscriptionId` no Firestore contém o `purchaseToken`.
3. Enviar notificação de teste.
4. Conferir `subscriptionStatus`, `currentPeriodEnd` e `subscription_log`.
5. Repetir a mensagem para confirmar idempotência.

O endpoint não confia no status enviado pelo Pub/Sub. A mensagem é apenas um
gatilho; o estado atual sempre é consultado novamente na Developer API.
