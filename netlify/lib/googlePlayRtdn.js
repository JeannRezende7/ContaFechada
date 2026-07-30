export class GooglePlayRtdnError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'GooglePlayRtdnError';
    this.status = status;
  }
}

export function parseGooglePlayRtdn(body) {
  const encoded = body?.message?.data;
  if (!encoded) throw new GooglePlayRtdnError('Pub/Sub message.data ausente');

  let notification;
  try {
    notification = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  } catch {
    throw new GooglePlayRtdnError('Pub/Sub message.data inválido');
  }

  const subscription = notification.subscriptionNotification;
  if (!notification.packageName || !subscription?.purchaseToken) {
    throw new GooglePlayRtdnError('notificação de assinatura incompleta');
  }

  return {
    packageName: notification.packageName,
    purchaseToken: subscription.purchaseToken,
    subscriptionId: subscription.subscriptionId ?? null,
    notificationType: subscription.notificationType,
    eventTimeMillis: notification.eventTimeMillis ?? null,
    messageId: body.message.messageId ?? null,
  };
}

export async function findSubscriptionOwner(db, purchaseToken) {
  const snapshot = await db
    .collectionGroup('private')
    .where('subscriptionId', '==', purchaseToken)
    .limit(2)
    .get();
  const matches = snapshot.docs.filter(
    (doc) =>
      /^users\/[^/]+\/private\/subscription$/.test(doc.ref.path) &&
      doc.data()?.subscriptionProvider === 'google_play'
  );
  if (matches.length !== 1) {
    throw new GooglePlayRtdnError(
      matches.length ? 'purchaseToken associado a mais de uma conta' : 'purchaseToken sem conta associada',
      matches.length ? 409 : 404
    );
  }
  return matches[0].ref.path.split('/')[1];
}

/**
 * RTDN é apenas um gatilho: o estado recebido nunca é confiado. O backend
 * consulta novamente a Developer API e aplica somente essa resposta.
 */
export async function processGooglePlayRtdn({
  body,
  expectedPackageName,
  db,
  getAccessToken,
  fetchPurchase,
  applySubscription,
}) {
  const event = parseGooglePlayRtdn(body);
  if (event.packageName !== expectedPackageName) {
    throw new GooglePlayRtdnError('packageName inesperado', 403);
  }

  const uid = await findSubscriptionOwner(db, event.purchaseToken);
  const accessToken = await getAccessToken();
  const purchase = await fetchPurchase({
    packageName: event.packageName,
    purchaseToken: event.purchaseToken,
    accessToken,
  });
  const patch = await applySubscription(
    uid,
    { ...purchase, purchaseToken: event.purchaseToken },
    { actor: `google_play_rtdn:${event.notificationType ?? 'unknown'}` }
  );

  return { uid, event, patch };
}
