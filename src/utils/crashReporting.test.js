import { describe, expect, it } from 'vitest';
import { sanitizeCrashText } from './crashReporting.js';

describe('sanitizeCrashText', () => {
  it('removes email, token, identifier and financial values', () => {
    const value = 'user nome@site.com token eyJabc.def.ghi id abcdefghijklmnopqrstuvwxyz valor R$ 1.234,56';
    const safe = sanitizeCrashText(value);
    expect(safe).not.toContain('nome@site.com');
    expect(safe).not.toContain('eyJabc.def.ghi');
    expect(safe).not.toContain('abcdefghijklmnopqrstuvwxyz');
    expect(safe).not.toContain('1.234,56');
  });

  it('limits the payload size', () => {
    expect(sanitizeCrashText('erro '.repeat(200)).length).toBeLessThanOrEqual(500);
  });
});
