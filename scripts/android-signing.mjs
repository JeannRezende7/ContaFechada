import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const signingDir = path.join(root, 'android', 'signing');
const keyPath = path.join(signingDir, 'contafechada-release.jks');
const propertiesPath = path.join(signingDir, 'keystore.properties');
const alias = 'contafechada';

function runKeytool(args, options = {}) {
  const result = spawnSync('keytool', args, { cwd: root, stdio: 'inherit', shell: false, ...options });
  if (result.status !== 0) throw new Error('O keytool não conseguiu preparar a assinatura Android.');
}

async function setup() {
  const hasKey = existsSync(keyPath);
  const hasProperties = existsSync(propertiesPath);
  if (hasKey !== hasProperties) {
    throw new Error('Assinatura incompleta em android/signing. Restaure juntos o arquivo .jks e keystore.properties.');
  }
  if (hasKey) {
    console.log('Assinatura Android permanente encontrada.');
    return;
  }

  await mkdir(signingDir, { recursive: true });
  const password = randomBytes(32).toString('base64url');
  runKeytool([
    '-genkeypair',
    '-v',
    '-keystore', keyPath,
    '-storetype', 'PKCS12',
    '-storepass', password,
    '-keypass', password,
    '-alias', alias,
    '-keyalg', 'RSA',
    '-keysize', '4096',
    '-validity', '10000',
    '-dname', 'CN=Conta Fechada, OU=LeliaLabs, O=LeliaLabs, L=Brasil, ST=Brasil, C=BR',
  ]);
  await writeFile(propertiesPath, [
    'storeFile=signing/contafechada-release.jks',
    `storePassword=${password}`,
    `keyAlias=${alias}`,
    `keyPassword=${password}`,
    '',
  ].join('\n'), { encoding: 'utf8', mode: 0o600 });
  console.log('Assinatura Android permanente criada em android/signing. Faça backup externo dessa pasta.');
}

async function check() {
  if (!existsSync(keyPath) || !existsSync(propertiesPath)) {
    throw new Error('Assinatura Android ausente. Rode npm run android:signing:setup.');
  }
  const properties = Object.fromEntries(
    (await readFile(propertiesPath, 'utf8'))
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => line.split(/=(.*)/s).slice(0, 2))
  );
  runKeytool([
    '-list', '-v',
    '-keystore', keyPath,
    '-storepass', properties.storePassword,
    '-alias', properties.keyAlias,
  ]);
}

const action = process.argv[2] ?? 'setup';
if (action === 'setup') await setup();
else if (action === 'check') await check();
else throw new Error(`Ação desconhecida: ${action}`);
