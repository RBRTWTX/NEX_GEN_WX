import { spawnSync } from 'node:child_process';

const checks = [
  'validate:reference',
  'validate:tauri-versions',
  'validate:release-version',
  'audit',
  'validate:foundation',
  'validate:stabilization',
  'validate:functional-repair',
  'validate:map-controllers',
  'validate:module-architecture',
  'validate:scene-objects',
  'validate:render-pipeline',
  'test:state',
  'test:modules',
  'test:scene-objects',
  'validate:radar-provider',
  'test:radar-provider',
  'validate:radar-renderer',
  'validate:broadcast-context',
  'test:radar-runtime',
  'test:radar-controller',
  'validate:satellite-provider',
  'test:satellite-provider',
  'validate:satellite-renderer',
  'test:satellite-runtime',
  'validate:tropical-provider',
  'test:tropical-provider',
  'validate:tropical-renderer',
  'test:tropical-runtime',
  'check',
];

const failures = [];

for (const script of checks) {
  console.log(`\n${'='.repeat(78)}`);
  console.log(`VALIDATION DIAGNOSTIC: npm run ${script}`);
  console.log(`${'='.repeat(78)}\n`);

  const result = process.platform === 'win32'
    ? spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', `npm run ${script}`], {
        cwd: process.cwd(),
        stdio: 'inherit',
      })
    : spawnSync('npm', ['run', script], {
        cwd: process.cwd(),
        stdio: 'inherit',
      });

  if (result.error) {
    failures.push({ script, detail: result.error.message });
    continue;
  }
  if (result.status !== 0) {
    failures.push({ script, detail: `exit ${result.status ?? 'unknown'}` });
  }
}

const passed = checks.length - failures.length;
console.log(`\n${'='.repeat(78)}`);
console.log(`VALIDATION DIAGNOSTICS COMPLETE: ${passed}/${checks.length} checks passed.`);
if (failures.length) {
  console.error(`FAILED CHECKS (${failures.length}):`);
  for (const failure of failures) {
    console.error(`  - ${failure.script}: ${failure.detail}`);
  }
  console.error('\nFix the complete failure list above before running the official npm run validate gate.');
  process.exitCode = 1;
} else {
  console.log('All diagnostic checks passed. Run npm run validate once for the official fail-fast release gate.');
}
