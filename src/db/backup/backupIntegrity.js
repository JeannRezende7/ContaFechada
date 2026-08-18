function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function summarizeBackup(snapshot) {
  const domains = {};
  let records = 0;
  let financialTotal = 0;
  let incomeTotal = 0;
  let expenseTotal = 0;
  for (const [domain, items] of Object.entries(snapshot ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
    if (!Array.isArray(items)) continue;
    const count = items.length;
    const valueTotal = domain === 'lancamentos'
      ? roundMoney(items.reduce((sum, item) => sum + (Number(item.valor) || 0), 0))
      : null;
    domains[domain] = { count, valueTotal };
    records += count;
    if (valueTotal != null) financialTotal = roundMoney(financialTotal + valueTotal);
    if (domain === 'lancamentos') {
      incomeTotal = roundMoney(items.filter((item) => item.tipo === 'receita')
        .reduce((sum, item) => sum + (Number(item.valor) || 0), 0));
      expenseTotal = roundMoney(items.filter((item) => item.tipo === 'despesa')
        .reduce((sum, item) => sum + (Number(item.valor) || 0), 0));
    }
  }
  return { records, financialTotal, incomeTotal, expenseTotal, balance: roundMoney(incomeTotal - expenseTotal), domains };
}

export function assertBackupEquivalent(expectedSnapshot, actualSnapshot) {
  const expected = summarizeBackup(expectedSnapshot);
  const actual = summarizeBackup(actualSnapshot);
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    const error = new Error('A verificacao do backup encontrou divergencia. Nenhum dado foi substituido.');
    error.name = 'BackupIntegrityError';
    error.expected = expected;
    error.actual = actual;
    throw error;
  }
  return actual;
}
