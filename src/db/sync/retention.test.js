import { describe, expect, it } from 'vitest';
import { CLOUD_RETENTION_DAYS, cloudDeletionDate } from './retention.js';

describe('cloudDeletionDate', () => {
  it('adds the retention window (90 days by default) to currentPeriodEnd', () => {
    expect(cloudDeletionDate('2026-01-01T00:00:00.000Z')).toBe('2026-04-01T00:00:00.000Z');
  });

  it('accepts a custom retention window', () => {
    expect(cloudDeletionDate('2026-01-01T00:00:00.000Z', 30)).toBe('2026-01-31T00:00:00.000Z');
  });

  it('returns null when there is no known period end', () => {
    expect(cloudDeletionDate(null)).toBeNull();
    expect(cloudDeletionDate(undefined)).toBeNull();
  });

  it('exports the documented default of 90 days', () => {
    expect(CLOUD_RETENTION_DAYS).toBe(90);
  });
});
