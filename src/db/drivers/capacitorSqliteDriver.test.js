import { describe, expect, it, vi } from 'vitest';
import { createCapacitorSqliteDriver } from './capacitorSqliteDriver.js';

describe('createCapacitorSqliteDriver', () => {
  it('mantém os comandos dentro da transação nativa', async () => {
    const connection = {
      run: vi.fn().mockResolvedValue({ changes: { changes: 1 } }),
      query: vi.fn().mockResolvedValue({ values: [] }),
      beginTransaction: vi.fn().mockResolvedValue({}),
      commitTransaction: vi.fn().mockResolvedValue({}),
      rollbackTransaction: vi.fn().mockResolvedValue({}),
    };
    const driver = createCapacitorSqliteDriver(connection);

    await driver.transaction(async (tx) => {
      await tx.run('INSERT INTO exemplo VALUES (?)', ['valor']);
    });

    expect(connection.beginTransaction).toHaveBeenCalledOnce();
    expect(connection.run).toHaveBeenCalledWith(
      'INSERT INTO exemplo VALUES (?)', ['valor'], false
    );
    expect(connection.commitTransaction).toHaveBeenCalledOnce();
    expect(connection.rollbackTransaction).not.toHaveBeenCalled();
  });
});
