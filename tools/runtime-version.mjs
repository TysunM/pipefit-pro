// Prints the runtime version an installed build must match for an OTA push to
// reach it. `runtimeVersion.policy` is "fingerprint", so this is a hash of
// everything that ends up in the native app: native modules, config plugins,
// app.json, eas.json, .gitignore and package.json scripts.
//
// Run it before `npm run push`. If it differs from the runtime version of the
// APK on the phone (expo.dev -> Builds -> the build -> Runtime version), the
// push will publish but no installed app will ever download it. Rebuild.
import { execFileSync } from 'node:child_process';

const platform = process.argv[2] ?? 'android';
const raw = execFileSync(
  process.execPath,
  ['node_modules/expo-updates/bin/cli.js', 'runtimeversion:resolve', '--platform', platform],
  { encoding: 'utf8' }
);

const line = raw.split('\n').find((l) => l.trimStart().startsWith('{'));
if (!line) {
  console.error(raw.trim() || 'expo-updates printed no JSON.');
  process.exit(1);
}

const { runtimeVersion } = JSON.parse(line);
if (!runtimeVersion) {
  console.error('No runtimeVersion in the resolver output.');
  process.exit(1);
}
console.log(runtimeVersion);
