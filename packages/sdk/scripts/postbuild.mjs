// After tsup builds dist/, write the PUBLISHED package manifest (name: specter-sdk,
// zero deps) and copy the README in, so `dist/` is a ready-to-publish package:
//   pnpm --filter @specter/sdk build && npm publish packages/sdk/dist
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const manifest = {
  name: 'specter-sdk',
  version,
  description:
    'Thin client for Specter — the detect → block → prove firewall / decision API for AI-agent payments. Guard.check() + a drop-in Claude Code hook. Zero dependencies.',
  type: 'module',
  main: './index.cjs',
  module: './index.js',
  types: './index.d.ts',
  exports: {
    '.': {
      import: { types: './index.d.ts', default: './index.js' },
      require: { types: './index.d.cts', default: './index.cjs' },
    },
    './package.json': './package.json',
  },
  sideEffects: false,
  license: 'MIT',
  homepage: 'https://specter-ia.vercel.app',
  repository: {
    type: 'git',
    url: 'git+https://github.com/Eras256/Specter.git',
    directory: 'packages/sdk',
  },
  keywords: [
    'ai-agents',
    'agent-security',
    'payments',
    'prompt-injection',
    'firewall',
    'claude-code',
    'specter',
  ],
  engines: { node: '>=18' },
  publishConfig: { access: 'public' },
};

writeFileSync(join(root, 'dist', 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
copyFileSync(join(root, 'README.md'), join(root, 'dist', 'README.md'));
console.log('postbuild: wrote dist/package.json (specter-sdk) + README.md');
