# Controle interno de assinaturas

A página interna fica em `/controle-assinaturas`. Ela permite:

- listar assinaturas Premium atualmente ativas;
- conceder Premium por UID ou e-mail, com prazo de 1 a 3650 dias;
- marcar uma concessão manual como fundador;
- remover Premium imediatamente;
- registrar concessões e remoções em `subscription_log`, com o UID do administrador.

## Habilitar o primeiro administrador

O acesso não depende apenas da rota: a Netlify Function valida um Firebase ID token
e exige a custom claim `admin: true`. Para atribuí-la:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\caminho\service-account.json"
npm run admin:set -- email@exemplo.com
```

Depois, saia e entre novamente no aplicativo. O script revoga os refresh tokens
anteriores para impedir que a mudança demore a entrar em vigor.

Para remover o acesso:

```powershell
npm run admin:set -- email@exemplo.com --remove
```

O script preserva quaisquer outras custom claims existentes. A chave da service
account é um segredo operacional: não deve entrar no repositório, no bundle web
ou no bundle Android.

## Segurança e limites

- Somente o Admin SDK altera assinaturas; o cliente não recebe credenciais elevadas.
- Tanto leitura quanto escrita retornam `401` sem token e `403` sem a claim.
- O endpoint aceita apenas `GET` e `POST`, valida ação, identificador e duração.
- Erros internos não são devolvidos ao navegador.
- A listagem possui busca e paginação de até 100 registros por página.
- O histórico auditável de cada assinatura pode ser consultado pela página.
- O endpoint rejeita corpos acima de 4 KiB e identificadores excessivos.
- A rota e o código do painel não entram no bundle Android.
- Remover Premium é imediato e não cancela uma cobrança externa. Para uma assinatura
  da Play Store, o cancelamento financeiro ainda deve seguir o fluxo do provedor.

Não existe um administrador padrão. O primeiro precisa ser criado pelo script acima
em um ambiente seguro.
