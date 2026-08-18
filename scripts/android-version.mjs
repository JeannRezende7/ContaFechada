import { readFile, writeFile } from 'node:fs/promises';

const packagePath = new URL('../package.json', import.meta.url);
const gradlePath = new URL('../android/app/build.gradle', import.meta.url);
const pkg = JSON.parse(await readFile(packagePath, 'utf8'));
const gradle = await readFile(gradlePath, 'utf8');
const codeMatch = gradle.match(/versionCode\s+(\d+)/);
const nameMatch = gradle.match(/versionName\s+"([^"]+)"/);
if (!codeMatch || !nameMatch) throw new Error('versionCode/versionName nao encontrados em android/app/build.gradle.');

if (process.argv.includes('--bump')) {
  const nextCode = Number(codeMatch[1]) + 1;
  const updated = gradle
    .replace(/versionCode\s+\d+/, `versionCode ${nextCode}`)
    .replace(/versionName\s+"[^"]+"/, `versionName "${pkg.version}"`);
  await writeFile(gradlePath, updated);
  console.log(`Android atualizado: versionCode=${nextCode}, versionName=${pkg.version}`);
} else {
  if (nameMatch[1] !== pkg.version) {
    throw new Error(`versionName=${nameMatch[1]} diverge de package.json=${pkg.version}. Rode npm run android:version:bump.`);
  }
  if (Number(codeMatch[1]) < 1) throw new Error('versionCode deve ser positivo.');
  console.log(`Android consistente: versionCode=${codeMatch[1]}, versionName=${nameMatch[1]}`);
}
