import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const apkPath = path.join(root, 'downloads', 'conta-fechada.apk');
const metadataPath = path.join(root, 'downloads', 'conta-fechada.json');
const generatedApk = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const inputs = [
  'android/app/build.gradle',
  'android/app/google-services.json',
  'android/app/src/main',
  'android/build.gradle',
  'android/variables.gradle',
  'capacitor.config.json',
  'package-lock.json',
  'package.json',
  'src',
  'vite.config.js',
];

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function trackedFiles() {
  const result = spawnSync('git', ['ls-files', '--', ...inputs], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'Nao foi possivel listar os arquivos Android.');
  return result.stdout.split(/\r?\n/).filter(Boolean).sort();
}

async function sourceFingerprint() {
  const hash = createHash('sha256');
  for (const relativePath of trackedFiles()) {
    const contents = await readFile(path.join(root, relativePath));
    const blob = spawnSync('git', ['hash-object', `--path=${relativePath.replaceAll('\\', '/')}`, '--stdin'], {
      cwd: root,
      input: contents,
      encoding: 'utf8',
    });
    if (blob.status !== 0) throw new Error(blob.stderr || `Nao foi possivel calcular o hash de ${relativePath}.`);
    hash.update(relativePath.replaceAll('\\', '/'));
    hash.update('\0');
    // Git applies the repository's text normalization here, so the same
    // source produces the same fingerprint on Windows and Netlify/Linux.
    hash.update(blob.stdout.trim());
    hash.update('\0');
  }
  return hash.digest('hex');
}

async function apkFingerprint() {
  return createHash('sha256').update(await readFile(apkPath)).digest('hex');
}

async function readVersions() {
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const gradle = await readFile(path.join(root, 'android', 'app', 'build.gradle'), 'utf8');
  const versionCode = gradle.match(/versionCode\s+(\d+)/)?.[1];
  const versionName = gradle.match(/versionName\s+"([^"]+)"/)?.[1];
  if (!versionCode || !versionName || versionName !== pkg.version) {
    throw new Error('Versoes inconsistentes. Rode npm run android:version:bump antes de publicar.');
  }
  return { version: pkg.version, versionCode: Number(versionCode) };
}

async function check() {
  const [metadataText, sourceHash, apkHash] = await Promise.all([
    readFile(metadataPath, 'utf8'),
    sourceFingerprint(),
    apkFingerprint(),
  ]);
  const metadata = JSON.parse(metadataText);
  const versions = await readVersions();
  if (metadata.sourceSha256 !== sourceHash || metadata.apkSha256 !== apkHash || metadata.version !== versions.version || metadata.versionCode !== versions.versionCode) {
    throw new Error('APK da web esta desatualizado. Rode npm run android:download:update e inclua downloads/ no commit.');
  }
  console.log(`APK da web conferido: v${metadata.version} (${metadata.versionCode}) ${apkHash.slice(0, 12)}`);
}

async function update() {
  run('node', ['scripts/android-signing.mjs', 'setup']);
  run('node', ['scripts/android-version.mjs', '--bump']);
  run('npm', ['run', 'build:android']);
  run('npx', ['cap', 'sync', 'android']);
  run(process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew', ['assembleRelease'], path.join(root, 'android'));
  await mkdir(path.dirname(apkPath), { recursive: true });
  await copyFile(generatedApk, apkPath);
  const versions = await readVersions();
  const artifact = await stat(apkPath);
  const metadata = {
    ...versions,
    sourceSha256: await sourceFingerprint(),
    apkSha256: await apkFingerprint(),
    size: artifact.size,
    generatedAt: new Date().toISOString(),
  };
  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
  console.log(`APK atualizado em downloads/conta-fechada.apk (${artifact.size} bytes).`);
}

const action = process.argv[2] ?? 'check';
try {
  if (action === 'update') await update();
  else if (action === 'check') await check();
  else throw new Error(`Acao desconhecida: ${action}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
