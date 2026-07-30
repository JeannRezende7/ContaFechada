import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';

const PROJECT_ID = 'contafechada-rules-test';
let testEnv;

function initialSubscription(overrides = {}) {
  return {
    plan: 'free',
    subscriptionStatus: 'none',
    subscriptionProvider: 'manual',
    subscriptionId: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    trialStartedAt: null,
    trialEndsAt: null,
    founder: false,
    createdAt: serverTimestamp(),
    ...overrides,
  };
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('Firestore owner data', () => {
  it('denies unauthenticated reads and writes', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    const ref = doc(db, 'users/user-a/lancamentos/item-1');
    await assertFails(getDoc(ref));
    await assertFails(setDoc(ref, { valor: 10 }));
  });

  it('allows the owner and denies another user', async () => {
    const ownerDb = testEnv.authenticatedContext('user-a').firestore();
    const otherDb = testEnv.authenticatedContext('user-b').firestore();
    const path = 'users/user-a/lancamentos/item-1';

    await assertSucceeds(setDoc(doc(ownerDb, path), { valor: 10 }));
    await assertSucceeds(getDoc(doc(ownerDb, path)));
    await assertFails(getDoc(doc(otherDb, path)));
    await assertFails(updateDoc(doc(otherDb, path), { valor: 999 }));
    await assertFails(deleteDoc(doc(otherDb, path)));

    const planningPath = 'users/user-a/planejamento/2026-07';
    await assertSucceeds(setDoc(doc(ownerDb, planningPath), {
      monthKey: '2026-07',
      saldoInicial: 100,
      orcamentos: { alimentacao: 500 },
    }));
    await assertFails(getDoc(doc(otherDb, planningPath)));

    const freeValuePath = 'users/user-a/valorLivre/2026-07';
    await assertSucceeds(setDoc(doc(ownerDb, freeValuePath), {
      monthKey: '2026-07',
      distribuicoes: [{ nome: 'Comida', categoriaId: 'mercado', valor: 500 }],
    }));
    await assertFails(getDoc(doc(otherDb, freeValuePath)));

    const rulePath = 'users/user-a/regrasCategorizacao/regra-1';
    await assertSucceeds(setDoc(doc(ownerDb, rulePath), { termo: 'Uber', categoriaId: 'transporte' }));
    await assertFails(getDoc(doc(otherDb, rulePath)));

    const closingPath = 'users/user-a/fechamentos/2026-07';
    await assertSucceeds(setDoc(doc(ownerDb, closingPath), { saldoReal: 100 }));
    await assertSucceeds(getDoc(doc(ownerDb, closingPath)));
    await assertFails(updateDoc(doc(ownerDb, closingPath), { saldoReal: 200 }));
    await assertFails(getDoc(doc(otherDb, closingPath)));
  });

  it('denies collections that were not explicitly allowed', async () => {
    const ownerDb = testEnv.authenticatedContext('user-a').firestore();
    await assertFails(setDoc(doc(ownerDb, 'users/user-a/colecaoInesperada/item-1'), { value: true }));
  });

  // Fase 2 (roadmap local-first) added sync metadata to every doc written by
  // firebase/firestore.js: deviceId, syncStatus, localVersion, deletedAt,
  // plus updatedAt via serverTimestamp(). These rules don't restrict field
  // names for the general collections (only ownership), so this just
  // confirms that assumption against the real emulator instead of leaving
  // it as an untested claim.
  it('accepts the Fase 2 sync metadata fields on a general collection doc', async () => {
    const ownerDb = testEnv.authenticatedContext('user-a').firestore();
    const otherDb = testEnv.authenticatedContext('user-b').firestore();
    const path = 'users/user-a/lancamentos/synced-item';

    await assertSucceeds(setDoc(doc(ownerDb, path), {
      descricao: 'Mercado',
      valor: 100,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deletedAt: null,
      deviceId: 'device-1',
      syncStatus: 'synced',
      localVersion: 1,
    }));
    await assertSucceeds(getDoc(doc(ownerDb, path)));
    await assertFails(getDoc(doc(otherDb, path)));
  });
});

describe('subscription protection', () => {
  it('allows only the complete initial free subscription', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore();
    const ref = doc(db, 'users/user-a/private/subscription');

    await assertSucceeds(setDoc(ref, initialSubscription()));
  });

  it('denies privileged fields during initial creation', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore();
    const ref = doc(db, 'users/user-a/private/subscription');

    await assertFails(setDoc(ref, initialSubscription({ plan: 'premium', founder: true })));
  });

  it('denies direct promotion to an active paid plan', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'users/user-a/private/subscription'),
        initialSubscription({ createdAt: Timestamp.now() })
      );
    });

    const db = testEnv.authenticatedContext('user-a').firestore();
    const ref = doc(db, 'users/user-a/private/subscription');
    await assertFails(updateDoc(ref, {
      plan: 'premium',
      subscriptionStatus: 'active',
      founder: true,
    }));
  });

  it('denies adding backend-only fields to the trial transition', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'users/user-a/private/subscription'),
        initialSubscription({ createdAt: Timestamp.now() })
      );
    });
    const db = testEnv.authenticatedContext('user-a').firestore();
    await assertFails(updateDoc(doc(db, 'users/user-a/private/subscription'), {
      plan: 'premium',
      subscriptionStatus: 'trialing',
      subscriptionProvider: 'web',
      subscriptionId: null,
      cancelAtPeriodEnd: false,
      trialStartedAt: serverTimestamp(),
      trialEndsAt: Timestamp.fromMillis(Date.now() + 14 * 86_400_000),
      cloudCopyDeletedAt: serverTimestamp(),
    }));
  });

  it('denies a second trial transition', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'users/user-a/private/subscription'),
        initialSubscription({
          plan: 'premium',
          subscriptionStatus: 'trialing',
          subscriptionProvider: 'web',
          trialStartedAt: Timestamp.now(),
          trialEndsAt: Timestamp.fromMillis(Date.now() + 14 * 86_400_000),
          createdAt: Timestamp.now(),
        })
      );
    });
    const db = testEnv.authenticatedContext('user-a').firestore();
    await assertFails(updateDoc(doc(db, 'users/user-a/private/subscription'), {
      trialStartedAt: serverTimestamp(),
      trialEndsAt: Timestamp.fromMillis(Date.now() + 14 * 86_400_000),
    }));
  });

  it('allows the exact one-time trial transition', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'users/user-a/private/subscription'),
        initialSubscription({ createdAt: Timestamp.now() })
      );
    });

    const db = testEnv.authenticatedContext('user-a').firestore();
    const ref = doc(db, 'users/user-a/private/subscription');
    await assertSucceeds(updateDoc(ref, {
      plan: 'premium',
      subscriptionStatus: 'trialing',
      subscriptionProvider: 'web',
      subscriptionId: null,
      cancelAtPeriodEnd: false,
      trialStartedAt: serverTimestamp(),
      trialEndsAt: Timestamp.fromMillis(Date.now() + 14 * 86_400_000),
    }));
  });

  it('denies deleting the subscription to repeat a trial', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'users/user-a/private/subscription'),
        initialSubscription({
          plan: 'premium',
          subscriptionStatus: 'trialing',
          subscriptionProvider: 'web',
          trialStartedAt: Timestamp.now(),
          trialEndsAt: Timestamp.fromMillis(Date.now() + 14 * 86_400_000),
          createdAt: Timestamp.now(),
        })
      );
    });

    const db = testEnv.authenticatedContext('user-a').firestore();
    await assertFails(deleteDoc(doc(db, 'users/user-a/private/subscription')));
  });

  it('allows reading but never writing subscription logs', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'users/user-a/private/subscription/subscription_log/log-1'),
        { action: 'created' }
      );
    });

    const db = testEnv.authenticatedContext('user-a').firestore();
    const ref = doc(db, 'users/user-a/private/subscription/subscription_log/log-1');
    await assertSucceeds(getDoc(ref));
    await assertFails(setDoc(ref, { action: 'forged' }));
  });
});
