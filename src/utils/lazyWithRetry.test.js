import { beforeEach, describe, expect, it, vi } from 'vitest';
import { importWithChunkRecovery, isChunkLoadError } from './lazyWithRetry.js';

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe('lazyWithRetry', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', createStorage());
  });

  it('recognizes stale dynamic import failures without swallowing unrelated errors', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: /assets/old.js'))).toBe(true);
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new Error('Falha de validação'))).toBe(false);
  });

  it('returns a successfully imported module normally', async () => {
    const module = { default: () => null };
    await expect(importWithChunkRecovery(() => Promise.resolve(module))).resolves.toBe(module);
  });

  it('does not reload for an unrelated import exception', async () => {
    const error = new Error('Erro interno do módulo');
    await expect(importWithChunkRecovery(() => Promise.reject(error))).rejects.toBe(error);
  });
});
