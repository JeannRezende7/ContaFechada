import { getAdminDb } from '../lib/firebaseAdmin.js';
import { cleanupExpiredCloudCopies } from '../lib/cloudRetentionCleanup.js';
import { timingSafeEqual } from 'node:crypto';

export const config = { schedule: '@daily' };

function authorized(req) {
  if (req.headers.get('x-netlify-event') === 'schedule') return true;
  const secret = process.env.RETENTION_JOB_SECRET;
  const provided = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!secret || !provided) return false;
  const expectedBuffer = Buffer.from(secret);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

async function writeAudit(db, { dryRun, summary }) {
  await db.collection('maintenance_retention_runs').add({
    dryRun,
    scanned: summary.scanned,
    eligible: summary.eligible,
    deleted: summary.deleted,
    skipped: summary.skipped,
    errorCount: summary.errors.length,
    executedAt: new Date().toISOString(),
  });
}

export function createCleanupHandler({ getDb = getAdminDb, cleanup = cleanupExpiredCloudCopies, audit = writeAudit } = {}) {
  return async (req) => {
    if (!authorized(req)) return Response.json({ error: 'unauthorized' }, { status: 401 });

    try {
      const dryRun = new URL(req.url).searchParams.get('dryRun') === 'true';
      const db = getDb();
      const summary = await cleanup({ db, dryRun });
      await audit(db, { dryRun, summary });
      return Response.json({ ok: summary.errors.length === 0, dryRun, ...summary });
    } catch (error) {
      console.error('cleanup-expired-cloud-data: falha', error);
      return Response.json({ error: 'retention cleanup failed' }, { status: 500 });
    }
  };
}

export default createCleanupHandler();
