import { describe, expect, it, vi } from 'vitest';
import { CLOUD_BACKUP_INTERVAL_MS, isCloudBackupDue, restoreCloudBackupIfLocalEmpty } from './cloudBackup.js';

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

  it('never reads or merges cloud data when the local database already has records', async () => {
    const remote = { list: vi.fn() };
    const driver = { get: vi.fn().mockResolvedValue({ count: 3 }) };

    await expect(restoreCloudBackupIfLocalEmpty('u1', { driver, remote })).resolves.toEqual({
      restored: false,
      reason: 'local_not_empty',
    });
    expect(remote.list).not.toHaveBeenCalled();
  });

  it('leaves a new installation empty when the account has no cloud records', async () => {
    const remote = { list: vi.fn().mockResolvedValue([]) };
    const driver = { get: vi.fn().mockResolvedValue({ count: 0 }) };

    await expect(restoreCloudBackupIfLocalEmpty('u1', { driver, remote })).resolves.toEqual({
      restored: false,
      reason: 'cloud_empty',
    });
    expect(remote.list).toHaveBeenCalledTimes(10);
  });
});
