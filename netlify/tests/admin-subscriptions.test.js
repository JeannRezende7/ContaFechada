import { describe, expect, it, vi } from 'vitest';
import { createAdminSubscriptionsHandler } from '../functions/admin-subscriptions.js';

function request(method = 'GET', body) {
  return new Request('https://example.test/api/admin-subscriptions', {
    method,
    headers: { authorization: 'Bearer token', ...(body ? { 'content-type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

describe('admin subscriptions endpoint', () => {
  it('requires admin custom claim', async () => {
    const list = vi.fn();
    const forbidden = createAdminSubscriptionsHandler({ verifyToken: async () => ({ uid: 'u1' }), list });
    expect((await forbidden(request())).status).toBe(403);
    expect(list).not.toHaveBeenCalled();

    const unauthorized = createAdminSubscriptionsHandler({ verifyToken: async () => { throw new Error('bad'); }, list });
    expect((await unauthorized(request())).status).toBe(401);
  });

  it('lists and mutates only after authorization', async () => {
    const deps = {
      verifyToken: async () => ({ uid: 'admin1', admin: true }),
      getDb: () => 'db',
      getAuth: () => 'auth',
      list: vi.fn().mockResolvedValue([{ uid: 'u1' }]),
      grant: vi.fn().mockResolvedValue({ uid: 'u1' }),
      revoke: vi.fn().mockResolvedValue({ uid: 'u1' }),
    };
    const handler = createAdminSubscriptionsHandler(deps);
    expect(await (await handler(request())).json()).toEqual({
      subscriptions: [{ uid: 'u1' }],
      nextOffset: null,
    });
    expect(await (await handler(request('POST', { action: 'grant', identifier: 'u1', days: 30 }))).json()).toMatchObject({ ok: true, uid: 'u1' });
    expect(deps.grant).toHaveBeenCalledWith(expect.objectContaining({ adminUid: 'admin1', days: 30 }));
    expect(await (await handler(request('POST', { action: 'revoke', identifier: 'u1' }))).json()).toMatchObject({ ok: true });
  });

  it('does not leak internal errors', async () => {
    const handler = createAdminSubscriptionsHandler({
      verifyToken: async () => ({ uid: 'admin1', admin: true }),
      getDb: () => 'db',
      getAuth: () => 'auth',
      list: vi.fn().mockRejectedValue(new Error('private service key')),
    });
    const res = await handler(request());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'admin operation failed' });
  });

  it('limits payloads and exposes history only to admins', async () => {
    const history = vi.fn().mockResolvedValue([{ id: 'h1', action: 'grant' }]);
    const handler = createAdminSubscriptionsHandler({
      verifyToken: async () => ({ uid: 'admin1', admin: true }),
      getDb: () => 'db',
      getAuth: () => 'auth',
      history,
    });
    const response = await handler(new Request(
      'https://example.test/api/admin-subscriptions?action=history&uid=u1',
      { headers: { authorization: 'Bearer token' } }
    ));
    expect(await response.json()).toEqual({ history: [{ id: 'h1', action: 'grant' }] });

    const oversized = await handler(new Request('https://example.test/api/admin-subscriptions', {
      method: 'POST',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'grant', identifier: 'x'.repeat(5000) }),
    }));
    expect(oversized.status).toBe(413);
  });
});
