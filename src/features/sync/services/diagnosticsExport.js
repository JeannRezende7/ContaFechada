export function buildDiagnosticsReport(health, { appVersion = 'unknown', platform = 'unknown', now = new Date() } = {}) {
  return {
    generatedAt: now.toISOString(),
    appVersion,
    platform,
    sync: health,
  };
}

export function downloadDiagnosticsReport(report) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `conta-fechada-diagnostico-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
