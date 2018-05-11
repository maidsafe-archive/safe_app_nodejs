#!/usr/bin/env node
const { spawn } = require('child_process');

const env = process.env.NODE_ENV || 'production';

const isRunningDevelopment = /^dev/.test(env);
const disableSystemUri = process.env.DISABLE_SAFE_SYSTEM_URI || false;
const spawnArgs = ['run', 'install-mock', '--package'];
if (disableSystemUri) {
  spawnArgs.push('disable-system-uri.json');
} else {
  spawnArgs.push('package.json');
}

if (isRunningDevelopment) {
  spawn(
    'yarn',
    spawnArgs,
    { shell: true, env: process.env, stdio: 'inherit' });
}
