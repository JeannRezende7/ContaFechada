import { readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist-android/', import.meta.url));
const FORBIDDEN = [
  'create-checkout',
  'MERCADOPAGO_ACCESS_TOKEN',
  'MERCADOPAGO_WEBHOOK_SECRET',
  'GOOGLE_PLAY_SERVICE_ACCOUNT',
  'FIREBASE_SERVICE_ACCOUNT',
  'BEGIN PRIVATE KEY',
  'admin-subscriptions',
  'Controle de assinaturas',
];

async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  }));
  return nested.flat();
}

const hits = [];
for (const path of await files(DIST)) {
  if (!['.js', '.html', '.json'].includes(extname(path))) continue;
  const content = await readFile(path, 'utf8');
  for (const token of FORBIDDEN) {
    if (content.includes(token)) hits.push({ file: path, token });
  }
}

if (hits.length) {
  console.error('Android bundle contém referências proibidas:', hits);
  process.exitCode = 1;
} else {
  console.log('Android bundle auditado: checkout Web e segredos ausentes.');
}
