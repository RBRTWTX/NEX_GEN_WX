import fs from 'node:fs/promises';

const packageJson = JSON.parse(
  await fs.readFile(new URL('../package.json', import.meta.url), 'utf8'),
);
const cargoToml = await fs.readFile(
  new URL('../src-tauri/Cargo.toml', import.meta.url),
  'utf8',
);

function majorMinor(version, label) {
  const match = String(version ?? '').match(/(\d+)\.(\d+)/);
  if (!match) {
    throw new Error(`Unable to parse ${label} version: ${String(version)}`);
  }
  return `${match[1]}.${match[2]}`;
}

function cargoVersion(crateName) {
  const escaped = crateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = new RegExp(
    `^${escaped}\\s*=\\s*\\{[^}]*version\\s*=\\s*"=?([^"\\s]+)"`,
    'm',
  );
  const match = cargoToml.match(expression);
  if (!match) {
    throw new Error(`Unable to find ${crateName} in src-tauri/Cargo.toml.`);
  }
  return match[1];
}

const apiVersion = packageJson.dependencies?.['@tauri-apps/api'];
const cliVersion = packageJson.devDependencies?.['@tauri-apps/cli'];
const rustVersion = cargoVersion('tauri');

if (!apiVersion) {
  throw new Error('Missing @tauri-apps/api in package.json dependencies.');
}
if (!cliVersion) {
  throw new Error('Missing @tauri-apps/cli in package.json devDependencies.');
}

const rustLine = majorMinor(rustVersion, 'tauri Rust crate');
const apiLine = majorMinor(apiVersion, '@tauri-apps/api');
const cliLine = majorMinor(cliVersion, '@tauri-apps/cli');

if (apiLine !== rustLine || cliLine !== rustLine) {
  throw new Error(
    `Tauri version mismatch: Rust ${rustVersion}, API ${apiVersion}, CLI ${cliVersion}. ` +
      `All must share major/minor ${rustLine}.`,
  );
}

console.log(
  `Tauri version validation passed: Rust ${rustVersion}, API ${apiVersion}, CLI ${cliVersion}.`,
);
