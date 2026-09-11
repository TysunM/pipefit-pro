# PipeFit Pro — Release Runbook

How to build, sign, install and update the Android app. Written so a future
you with no memory of this session can ship a release in ten minutes.

- **Package ID** `com.pipefitpro.app` — never change it, see [Invariants](#invariants)
- **Repo** `TysunM/pipefit-pro`, branch `main`
- **Build service** Expo EAS, free tier
- **Distribution** signed APK, sideloaded. Not on the Play Store.

---

## 1. First time on a new machine

Node 20 or newer. Check with `node -v`.

```powershell
git clone https://github.com/TysunM/pipefit-pro.git
cd pipefit-pro
npm ci
npm run eas -- login
```

`npm ci` is deliberate. It installs the exact versions in `package-lock.json`
and wipes any partial `node_modules` first. `npm install` may drift versions.

There is no global `eas` install. Every script calls `npx eas-cli@latest`, so
nothing depends on Windows picking up npm's global bin directory on PATH.

Then check whether `app.json` has `extra.eas.projectId`:

```powershell
node -e "console.log(require('./app.json').expo.extra?.eas?.projectId ?? 'MISSING')"
```

If it prints a UUID, you are done — **do not run `eas init` again**, it would
create a second EAS project and split the build history. If it prints
`MISSING`, run `npm run eas -- init` once, then commit the changed `app.json`.
That value belongs in version control; without it every build re-prompts to
create a new project.

---

## 2. Cut a release

```powershell
npm run typecheck
npm test
npm run prebuild:check
npm run build:apk
```

The first three are the gate. Never build on a red gate — a failed EAS build
costs 15 minutes and a queue slot.

`prebuild:check` generates the native Android project from `app.json` and
should finish with **zero warnings**. A warning here is a real config defect
that will reach the APK. It writes an `android/` directory that is gitignored
and safe to delete.

`build:apk` uploads and queues. You can close the terminal — the build runs on
Expo's servers. Track it at **expo.dev → pipefit-pro → Builds**.

| Phase | First build | Later builds |
|---|---|---|
| Queue | 0–25 min | 0–25 min |
| Compile | 12–20 min | 5–8 min |

Later builds are faster because EAS caches Gradle and `node_modules` against
the project fingerprint.

When it finishes you get a page with a QR code and a download link. **The link
expires in 30 days.**

---

## 3. Version numbers

Two fields in `app.json`, and they do different jobs.

| Field | Who reads it | Rule |
|---|---|---|
| `expo.version` | humans | Semver. `1.0.0` → `1.1.0` for features, `1.0.1` for fixes. |
| `expo.android.versionCode` | Android | Integer. **Must increase every release.** |

Android refuses to install an APK whose `versionCode` is lower than or equal
to the installed one. That failure reads as a generic "App not installed",
which is why it wastes so much time — see [Failure modes](#failure-modes).

Bump both, commit, then build:

```powershell
git add app.json
git commit -m "Release 1.1.0"
git push
npm run build:apk
```

The `production` profile has `autoIncrement: true` and bumps `versionCode`
for you. The `preview` profile does not — bump it by hand.

---

## 4. Keystore — read this before you need it

The keystore is the signing key. Android ties an installed app to the key that
signed it and will not let a differently-signed APK replace it.

**Lose the keystore and every existing install must be uninstalled before it
can be updated.** Uninstalling wipes saved settings. There is no recovery, no
support ticket, no workaround. This is the only irreversible artifact in the
project.

### Back it up

```powershell
npm run eas -- credentials
```

Follow the Android keystore prompts to the download option. Store the `.jks` file
and its passwords somewhere that survives a laptop failure or a move. A
password manager attachment and one offline copy is enough.

`*.keystore` and `*.jks` are gitignored. Never commit them — a public keystore
lets anyone ship a signed impostor of your app.

### Check which key EAS is using

```powershell
npm run eas -- credentials
```

The summary prints the SHA-256 fingerprint. If it ever changes unexpectedly,
stop and investigate before distributing the build.

---

## 5. Install on a phone

1. Open the build link on the phone, or scan the QR code.
2. Download the `.apk`.
3. Tap it. Allow **Install unknown apps** for your browser when prompted.
4. If Play Protect shows "unsafe app blocked" → **More details → Install anyway**.

Updates from a later build install straight over the top with no uninstall,
as long as the keystore is the same and `versionCode` went up.

---

## 6. Failure modes

Every one of these was hit for real. Cause, then fix.

### "Update this app" then "App not installed"

An app with package `com.pipefitpro.app` is already installed, signed with a
different key. Android will not overwrite across signatures.

**Settings → Apps → See all apps → search "pipefit" → Uninstall.** Then install.

Not in the list? It is under a second user or work profile:

```powershell
adb uninstall com.pipefitpro.app
```

### "App not installed" with no "update" prompt

Usually a `versionCode` that did not increase, or a truncated download.
Bump `versionCode` and re-download over Wi-Fi.

### `eas : The term 'eas' is not recognized`

A global `eas-cli` install that is missing, or installed but not on PATH —
a new terminal is required after any global npm install.

Do not fix the PATH. Use the scripts, which go through `npx`:

```powershell
npm run eas -- login
npm run eas -- credentials
```

The `--` matters. Without it npm swallows the argument instead of passing it
to `eas-cli`.

### `Failed to resolve plugin for module "expo-font" ... Do you have node modules installed?`

`node_modules` is missing. It is gitignored and never arrives with a clone.

```powershell
npm ci
```

### Gradle failure 8–12 minutes into the build

A real dependency or native config problem, not a fluke. The build page links
the full log; the failing Gradle task names the cause. Retrying an identical
build does not help.

### Build queued far longer than 25 minutes

Free-tier contention during US business hours. Nothing is wrong. Builds
survive a closed terminal, so leave it.

---

## 7. Invariants

Things that look harmless to change and are not. Each of these was a live
defect that only showed up in a standalone APK, never in Expo Go.

### Never commit `android/` or `ios/`

Both are gitignored. Committing prebuild output switches the project to the
bare workflow, after which `app.json` stops driving the icon, app name and
version — and the icon you see in the repo is no longer the icon on the phone.
Regenerate them any time with `npm run prebuild:check`.

### Never change `com.pipefitpro.app`

The package ID is the app's identity to Android. Changing it makes every
installed copy a separate app that cannot be updated from the new one.

### Keep `expo-system-ui` installed

`app.json` sets `userInterfaceStyle: "automatic"`. Without this package that
setting never reaches the native theme, and **Settings → Appearance → System**
silently sticks on light. Expo Go bundles the package, so this bug is
invisible in development and only appears in the APK.

### No `channel` in `eas.json` without `expo-updates`

The project does not use over-the-air updates. A `channel` field on a build
profile without `expo-updates` installed makes EAS reject the build outright.

### No `developmentClient: true` without `expo-dev-client`

Builds a development client that cannot connect to anything. If a dev build is
ever needed — AR work would need one — add the dependency in the same commit
as the profile.

---

## 8. Sharing with other people

The EAS build link expires after 30 days. For anything ongoing, re-run
`npm run build:apk` and send the fresh link.

Each recipient needs to allow installs from unknown sources once, on the app
they open the link with. After that, updates install over the top normally.

Everyone must install a build signed with the same keystore. Mixing keystores
across people means some of them can never update without uninstalling.
