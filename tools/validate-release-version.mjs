import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (relative) => readFile(new URL(relative, root), 'utf8');

const packageJson = JSON.parse(await read('package.json'));
const packageLock = JSON.parse(await read('package-lock.json'));
const tauriConfig = JSON.parse(await read('src-tauri/tauri.conf.json'));
const cargoToml = await read('src-tauri/Cargo.toml');
const cargoLock = await read('src-tauri/Cargo.lock');
const providerClient = await read('src-tauri/src/weather_engine/provider_client.rs');

const cargoVersion = cargoToml.match(
  /\[package\][\s\S]*?\nversion\s*=\s*"([^"]+)"/,
)?.[1];
const cargoLockVersion = cargoLock.match(
  /\[\[package\]\]\nname = "nex-gen-wx"\nversion = "([^"]+)"/,
)?.[1];

const versions = {
  package: packageJson.version,
  packageLock: packageLock.version,
  packageLockRoot: packageLock.packages?.['']?.version,
  tauri: tauriConfig.version,
  cargo: cargoVersion,
  cargoLock: cargoLockVersion,
};

const expected = versions.package;
if (!expected) throw new Error('package.json application version is missing.');

for (const [source, version] of Object.entries(versions)) {
  if (version !== expected) {
    throw new Error(`Release version mismatch: ${source}=${String(version)}; package.json=${expected}.`);
  }
}

if (!providerClient.includes(`NEX-GEN-WX/${expected}`)) {
  throw new Error(`Native provider User-Agent is not stamped NEX-GEN-WX/${expected}.`);
}

console.log(`Release version validation passed: all application metadata is ${expected}.`);
