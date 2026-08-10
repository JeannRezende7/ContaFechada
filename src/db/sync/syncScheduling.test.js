import { beforeEach, describe, expect, it } from 'vitest';
import { nextSyncIntervalMs } from '../../features/sync/components/SyncManager.jsx';
import { resetSyncDomainCursorForTests, selectNextSyncDomains } from './syncRuntime.js';

describe('política econômica de sincronização', () => {
  beforeEach(() => resetSyncDomainCursorForTests());

  it('consulta apenas um lote pequeno e alterna os domínios', () => {
    const domains = ['a', 'b', 'c', 'd'];
    expect(selectNextSyncDomains(domains, 2)).toEqual(['a', 'b']);
    expect(selectNextSyncDomains(domains, 2)).toEqual(['c', 'd']);
    expect(selectNextSyncDomains(domains, 2)).toEqual(['a', 'b']);
  });

  it('mantém 30 minutos inicialmente e recua após ciclos vazios repetidos', () => {
    expect(nextSyncIntervalMs(0)).toBe(30 * 60 * 1000);
    expect(nextSyncIntervalMs(2)).toBe(30 * 60 * 1000);
    expect(nextSyncIntervalMs(3)).toBe(60 * 60 * 1000);
    expect(nextSyncIntervalMs(6)).toBe(2 * 60 * 60 * 1000);
    expect(nextSyncIntervalMs(99)).toBe(4 * 60 * 60 * 1000);
  });
});
