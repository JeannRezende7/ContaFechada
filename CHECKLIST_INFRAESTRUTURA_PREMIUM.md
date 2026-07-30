# Checklist de infraestrutura Premium

## Firebase

- [ ] Criar projetos separados para desenvolvimento e produção.
- [ ] Registrar apps Web e Android com identificadores corretos.
- [ ] Configurar Authentication e provedores permitidos.
- [ ] Publicar e testar regras do Firestore em desenvolvimento.
- [ ] Ativar App Check; Play Integrity para Android.
- [ ] Criar orçamento, alertas e política de acesso das service accounts.

## Netlify

- [ ] Configurar `FIREBASE_SERVICE_ACCOUNT`.
- [ ] Configurar `MERCADOPAGO_ACCESS_TOKEN` e webhook secret.
- [ ] Configurar `GOOGLE_PLAY_SERVICE_ACCOUNT` e `ANDROID_PACKAGE_NAME`.
- [ ] Configurar `GOOGLE_PUBSUB_AUDIENCE` e service account do push.
- [ ] Configurar `RETENTION_JOB_SECRET`.
- [ ] Executar retenção primeiro com `dryRun=true` e revisar o relatório.
- [ ] Confirmar agendamento diário sem publicar funções duplicadas.

## Google Cloud e Play Console

- [ ] Criar conta Play Console e concluir verificação.
- [ ] Criar assinatura, produtos e planos base.
- [ ] Vincular service account à Android Publisher API.
- [ ] Configurar testadores e faixa interna.
- [ ] Criar tópico e assinatura push RTDN com OIDC.
- [ ] Preencher Segurança de dados e política de privacidade.
- [ ] Testar compra, acknowledgement, renovação, cancelamento e restauração.

## Liberação

- [ ] Rodar `npm run check:prelaunch` para testes, builds, auditoria e sync
      Capacitor; usar `npm run check:prelaunch:rules` quando o emulador
      Firebase estiver disponível.
- [ ] Rodar `npm test`, `npm run test:rules`, `npm run build`.
- [ ] Rodar `npm run build:android` e `npm run audit:android-bundle`.
- [ ] Executar [TESTES_MANUAIS_LOCAL_FIRST.md](TESTES_MANUAIS_LOCAL_FIRST.md).
- [ ] Confirmar backups e plano de rollback.
- [ ] Ativar `PREMIUM_ENFORCED` somente após aprovação completa.
