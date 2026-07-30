import { describe, expect, it } from 'vitest';
import { buildDiagnosticsReport } from './diagnosticsExport.js';

describe('diagnostics report', () => {
  it('builds a support-safe report without adding financial data', () => {
    const health = { filaPendente: 2, alertas: [], metricas: { errors: 1 } };
    expect(buildDiagnosticsReport(health, {
      appVersion: '5.3.0',
      platform: 'android',
      now: new Date('2026-07-30T10:00:00Z'),
    })).toEqual({
      generatedAt: '2026-07-30T10:00:00.000Z',
      appVersion: '5.3.0',
      platform: 'android',
      sync: health,
    });
  });
});
