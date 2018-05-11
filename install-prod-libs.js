#!/usr/bin/env node
const { spawn } = require('child_process');

const disableSystemUri = process.env.DISABLE_SAFE_SYSTEM_URI || false;
const spawnArgs = ['run', 'install-prod', '--package'];
if (disableSystemUri) {
  spawnArgs.push('disable-system-uri.json');
} else {
  spawnArgs.push('package.json');
}

spawn(
  'yarn',
  spawnArgs,
  { shell: true, env: process.env, stdio: 'inherit' });
