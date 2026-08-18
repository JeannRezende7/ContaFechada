import { spawnSync } from 'node:child_process';
import { createConnection } from 'node:net';

const includeRules = process.argv.includes('--rules');
const firestoreAlreadyRunning = includeRules && await new Promise((resolve) => {
  const socket = createConnection({ host: '127.0.0.1', port: 8080 });
  socket.setTimeout(500);
  socket.once('connect', () => { socket.destroy(); resolve(true); });
  socket.once('timeout', () => { socket.destroy(); resolve(false); });
  socket.once('error', () => resolve(false));
});
const commands = [
  ['npm', ['test']],
  ...(includeRules
    ? [firestoreAlreadyRunning
      ? ['npm', ['run', 'test:rules'], { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }]
      : ['npm', ['run', 'test:rules:emulator']]]
    : []),
  ['npm', ['run', 'build']],
  ['npm', ['run', 'build:android']],
  ['npm', ['run', 'audit:android-bundle']],
  ['npm', ['exec', '--', 'cap', 'sync', 'android']],
  ['npm', ['run', 'build']],
];

for (const [command, args, extraEnv] of commands) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const npmCli = process.env.npm_execpath;
  const executable = command === 'npm' && npmCli ? process.execPath : command;
  const executableArgs = command === 'npm' && npmCli ? [npmCli, ...args] : args;
  const result = spawnSync(executable, executableArgs, {
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  });
  if (result.error) console.error(`Falha ao iniciar ${command}:`, result.error);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log('\nChecklist automatizado concluído.');
