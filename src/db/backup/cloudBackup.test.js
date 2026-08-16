import { describe, expect, it } from 'vitest';
import { CLOUD_BACKUP_INTERVAL_MS, isCloudBackupDue } from './cloudBackup.js';

describe('cloud backup schedule', () => {
  const now = new Date('2026-08-16T12:00:00.000Z').getTime();

  it('backs up when there is no previous backup', () => {
    expect(isCloudBackupDue(null, now)).toBe(true);
  });

  it('does not back up again before 24 hours', () => {
    expect(isCloudBackupDue(new Date(now - CLOUD_BACKUP_INTERVAL_MS + 1).toISOString(), now)).toBe(false);
  });

  it('backs up after 24 hours or when the saved date is invalid', () => {
    expect(isCloudBackupDue(new Date(now - CLOUD_BACKUP_INTERVAL_MS).toISOString(), now)).toBe(true);
    expect(isCloudBackupDue('data-inválida', now)).toBe(true);
  });
});
