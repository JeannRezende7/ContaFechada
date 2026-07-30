import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCleanupHandler } from './cleanup-expired-cloud-data.js';
import { createGooglePlayRtdnHandler } from './google-play-rtdn.js';
import { GooglePlayRtdnError } from '../lib/googlePlayRtdn.js';

afterEach(() => {
  delete process.env.RETENTION_JOB_SECRET;
});

describe('retention HTTP endpoint', () => {
  it('rejects unauthenticated manual calls without touching Firestore', async () => {
    const cleanup = vi.fn();
    const handler = createCleanupHandler({ getDb: vi.fn(), cleanup, audit: vi.fn() });
    const res = await handler(new Request('https://example.test/api/cleanup-expired-cloud-data'));
    expect(res.status).toBe(401);
    expect(cleanup).not.toHaveBeenCalled();
  });

  it('supports authenticated dryRun with an auditable summary', async () => {
    process.env.RETENTION_JOB_SECRET = 'secret';
    const cleanup = vi.fn().mockResolvedValue({ scanned: 4, eligible: 2, deleted: 0, skipped: 2, errors: [] });
    const audit = vi.fn().mockResolvedValue();
    const handler = createCleanupHandler({ getDb: () => 'db', cleanup, audit });
    const res = await handler(new Request('https://example.test/api/cleanup-expired-cloud-data?dryRun=true', {
      headers: { authorization: 'Bearer secret' },
    }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, dryRun: true, scanned: 4, eligible: 2 });
    expect(cleanup).toHaveBeenCalledWith({ db: 'db', dryRun: true });
    expect(audit).toHaveBeenCalledWith('db', expect.objectContaining({ dryRun: true }));
  });

  it('does not leak internal errors', async () => {
    const handler = createCleanupHandler({
      getDb: () => { throw new Error('service-account-secret'); },
      cleanup: vi.fn(),
      audit: vi.fn(),
    });
    const req = new Request('https://example.test/api/cleanup', { headers: { 'x-netlify-event': 'schedule' } });
    const res = await handler(req);
    expect(await res.json()).toEqual({ error: 'retention cleanup failed' });
  });
});

describe('Google Play RTDN HTTP endpoint', () => {
  it('rejects methods before authentication', async () => {
    const verifyToken = vi.fn();
    const res = await createGooglePlayRtdnHandler({ verifyToken })(new Request('https://example.test', { method: 'GET' }));
    expect(res.status).toBe(405);
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it('returns only the message id on success', async () => {
    const processNotification = vi.fn().mockResolvedValue({ event: { messageId: 'm1' }, uid: 'secret-user' });
    const handler = createGooglePlayRtdnHandler({
      verifyToken: vi.fn().mockResolvedValue(),
      getDb: () => 'db',
      expectedPackageName: () => 'app',
      processNotification,
    });
    const res = await handler(new Request('https://example.test', {
      method: 'POST',
      body: JSON.stringify({ message: { data: 'x' } }),
    }));
    expect(await res.json()).toEqual({ ok: true, messageId: 'm1' });
  });

  it('preserves safe client errors and hides internal failures', async () => {
    const safe = createGooglePlayRtdnHandler({
      verifyToken: vi.fn().mockRejectedValue(new GooglePlayRtdnError('token inválido', 403)),
    });
    const safeRes = await safe(new Request('https://example.test', { method: 'POST', body: '{}' }));
    expect(safeRes.status).toBe(403);
    expect(await safeRes.json()).toEqual({ error: 'token inválido' });

    const internal = createGooglePlayRtdnHandler({ verifyToken: vi.fn().mockRejectedValue(new Error('private key')) });
    const internalRes = await internal(new Request('https://example.test', { method: 'POST', body: '{}' }));
    expect(internalRes.status).toBe(500);
    expect(await internalRes.json()).toEqual({ error: 'falha ao processar notificação' });
  });
});
