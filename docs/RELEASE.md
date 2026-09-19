# PipeFit Pro — Release Runbook

How to build, sign, install and update the Android app. Written so a future
you with no memory of this session can ship a release in ten minutes.

- **Package ID** `com.pipefitpro.app` — never change it, see [Invariants](#8-invariants)
- **Repo** `TysunM/pipefit-pro`, branch `main`
- **Build service** Expo EAS, free tier
- **Distribution** signed APK, sideloaded. Not on the Play Store.
- **Updates** over the air via EAS Update. A full rebuild is only for native changes.

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

**Most changes do not need a release.** A change to anything under `src/`,
`App.tsx` or `assets/` ships over the air in about a minute — jump to
[section 5](#5-push-an-update-over-the-air). Build an APK only when the native
app itself changed:

| Changed | How it ships |
|---|---|
| Calculations, screens, styling, reference tables, fonts, images | `npm run push` |
| A new dependency with native code, an Expo SDK bump | rebuild |
| `app.json` icon, splash, permissions, plugins, `versionCode` | rebuild |
| `eas.json`, `package.json` scripts, `.gitignore` | rebuild |

The last row surprises people. `runtimeVersion.policy` is `fingerprint`, and
those files are part of the fingerprint, so touching them makes every installed
app ineligible for the push. `npm run runtime-version` prints the current
fingerprint — see [section 5](#5-push-an-update-over-the-air).

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
which is why it wastes so much time — see [Failure modes](#7-failure-modes).

Bump both, commit, then build:

```powershell
git add app.json
git commit -m "Release 1.1.0"
git push
npm run build:apk
```

The `production` profile has `autoIncrement: true` and bumps `versionCode`
for you. The `preview` profile does not — bump it by hand.

Neither field moves for an over-the-air push. `expo.version` is the version of
the *installed app*, and a push does not reinstall anything. The settings screen
reads it, so it will keep reading `1.0.0` across a dozen pushes — that is
correct. What changed is shown next to it: **Updated Sep 14**.

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

Choose **Keystore → Go back** to read the summary without changing anything.
The signing key in use as of `1.0.0` is:

```
Key alias  929650bf4f67aa37d64e7b8cdc84b162
SHA-1      91:FF:77:12:9E:FC:40:69:4C:E2:1B:70:1A:C4:72:2F:D1:D6:B5:F6
```

A fingerprint is a public identifier — it is what Android reports to anyone
who inspects the APK — so it is safe to keep here. The keystore file and its
three passwords are not, and live only in a password manager.

If the fingerprint ever differs from the value above, a new keystore was
issued. **Stop.** Builds signed with it cannot update any installed copy.
Restore the original with **Keystore → Set up a new keystore → upload** using
the backed-up `.jks` and passwords before distributing anything.

### Do not press Enter on the keystore menu

`Set up a new keystore` is the first option and is highlighted by default.
Selecting it replaces the signing key and permanently orphans every installed
copy of the app. To back up, arrow down to **Download existing keystore**.

---

## 5. Push an update over the air

This is the normal way to ship. The app carries `expo-updates`; a push uploads
a new JS bundle to EAS and every installed copy picks it up.

```powershell
npm run typecheck
npm test
npm run runtime-version
npm run push
```

`push` publishes to the **preview** branch, which is the channel the
`build:apk` profile is on. `push:release` publishes to **production**, for
builds cut with `build:release`. Both use `--auto`, so the update is labelled
with the current git branch and commit message — commit before you push and the
EAS dashboard reads like the git log.

### What the phone does

| When | What happens |
|---|---|
| App opens | Checks, and downloads in the background. Launch never waits — no signal means it opens on the bundle it has. |
| Already open, brought back to the foreground | Re-checks, at most every 5 minutes. |
| Download finished | A **Update ready** bar appears. Tapping **Restart** applies it. |
| Bar dismissed, or never tapped | The update applies by itself the next time the app is opened cold. |

Nothing reloads underneath a fitter mid-calculation. That is deliberate —
losing a screen of dimensions on a lift is worse than running yesterday's build
for another hour.

**Settings → Updates** shows what is running and has a manual **Check for
updates** button.

### Confirm the push landed

`npm run runtime-version` prints a fingerprint like `de2267e1…`. The build on
the phone has one too — **expo.dev → pipefit-pro → Builds → the build →
Runtime version**. They must match exactly. If they do not, the push uploaded
fine and no phone will ever see it; the fix is a rebuild, never a re-push.

### Rolling one back

A bad push is undone by pushing again — the newest update on the branch wins.
`npm run eas -- update:republish --branch preview` reinstates an earlier one by
picking it from a list, which is faster than reverting the code.

The embedded bundle is the floor. A user who clears app storage, or reinstalls
the APK, is back on the code that shipped inside it until the next check.

---

## 6. Install on a phone

1. Open the build link on the phone, or scan the QR code.
2. Download the `.apk`.
3. Tap it. Allow **Install unknown apps** for your browser when prompted.
4. If Play Protect shows "unsafe app blocked" → **More details → Install anyway**.

Updates from a later build install straight over the top with no uninstall,
as long as the keystore is the same and `versionCode` went up.

This is only needed for native changes. Everything else reaches the phone
through [section 5](#5-push-an-update-over-the-air) with no download and no
install prompt.

---

## 7. Failure modes

Every one of these was hit for real. Cause, then fix.

### "Update this app" then "App not installed"

An app with package `com.pipefitpro.app` is already installed, signed with a
different key. Android will not overwrite across signatures.

**Settings → Apps → See all apps → search "pipefit" → Uninstall.** Then install.

Not in the list? It is under a second user or work profile:

```powershell
adb uninstall com.pipefitpro.app
```

### Pushed an update and the phone never gets it

The runtime versions do not match. Compare `npm run runtime-version` against
the build's **Runtime version** on expo.dev. Something in the native
fingerprint moved — usually `eas.json`, a `package.json` script, or a new
dependency. Re-pushing cannot fix it. Rebuild and reinstall.

Matching fingerprints but still nothing: check the app is on the branch you
pushed to. `Updates.channel` is shown under **Settings → Updates**; `npm run
push` writes to `preview`, `npm run push:release` to `production`.

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

### `Unexpected end of JSON input`, right after "Uploaded to EAS"

The upload finished and the CLI then failed. Those are two different calls:
the tarball goes to storage, and a second request asks the API to queue a
build from it. This message is that second response arriving empty — the CLI
ran `JSON.parse` on nothing. It says what broke and not a word about why.

**Check whether the build exists before retrying.** The server may have queued
it and only the reply got lost, and a blind retry then queues a second build
and spends a second build credit.

```
npx --yes eas-cli@latest build:list --platform android --limit 5
```

Or open the builds page. A build from the last few minutes means it worked —
watch it and scan its QR, and ignore the error.

Nothing queued, so it really did fail. In order:

1. **Run it again.** An empty response is usually one dropped connection. One
   retry settles most of these.
2. **Ask for the response it could not read.** `EXPO_DEBUG=1` in front of the
   command prints the HTTP exchange, which turns this message into a real one
   — an auth failure, a rate limit, a 502.

   ```
   EXPO_DEBUG=1 npx --yes eas-cli@latest build --platform android --profile preview
   ```
3. **Suspect the terminal before the API if you are on a phone.** Under Termux
   the Android OOM killer takes background processes, and `npx eas-cli` is a
   large Node process holding an upload. A killed process produces exactly
   this: the upload lands, the next reply never arrives. Keep Termux in the
   foreground with the screen on, or use the Build workflow below, which does
   not run on the phone at all.
4. **Use the Build workflow.** `.github/workflows/build.yml` runs the same
   command on GitHub's machines from a browser button. It removes the phone,
   the laptop and the local CLI from the question at once.

### Gradle failure 8–12 minutes into the build

A real dependency or native config problem, not a fluke. The build page links
the full log; the failing Gradle task names the cause. Retrying an identical
build does not help.

### Build queued far longer than 25 minutes

Free-tier contention during US business hours. Nothing is wrong. Builds
survive a closed terminal, so leave it.

---

## 8. Invariants

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

### Keep `channel` and `expo-updates` together

Every build profile in `eas.json` carries a `channel`, and `expo-updates` is a
dependency. Removing either without the other breaks the pair: a `channel` with
no `expo-updates` makes EAS reject the build outright, and `expo-updates` with
no channel builds an app that can never be reached by a push.

### Leave `runtimeVersion.policy` on `fingerprint`

A fixed string such as `"1.0.0"` would make pushes land more often, because
editing a script or a config file would stop invalidating them. It would also
make it possible to push a bundle that calls a native module the installed APK
does not contain, which crashes on launch, on every phone, with no way back in
to fix it.

`fingerprint` fails the other way: a push that does not match is simply never
downloaded. An update that quietly does not arrive is recoverable. An app that
will not open on a job is not.

### No `developmentClient: true` without `expo-dev-client`

Builds a development client that cannot connect to anything. If a dev build is
ever needed — AR work would need one — add the dependency in the same commit
as the profile.

---

## 9. The web app, for anyone without an Android

`npm run web:build`, or push to `main` and take the **pipefit-pro-web**
artifact off the run in Actions. That is the whole build.

That is also the whole iOS story. An iPhone cannot take a sideloaded APK and
Apple charges 99 dollars a year before it will let an app onto a device on any
terms, TestFlight included. The web build sidesteps all of it: Safari, Share,
Add to Home Screen puts it on the dock as an app, offline, free, with no
account and nothing on any store. The same link installs on Android.

### Hosting it

**This repository is private, and GitHub Pages will not serve a private
repository on a free account.** The deploy fails at `actions/configure-pages`
with nothing the workflow can do about it, which is why the Pages job is off by
default.

| Route | Cost | Private repo | Gets you |
|---|---|---|---|
| **Cloudflare Pages** | free | yes | `pipefit-pro.pages.dev`, auto-deploys on push |
| **Netlify** | free | yes | `<name>.netlify.app`, auto-deploys on push |
| GitHub Pages | $4/mo Pro | with Pro | `tysunm.github.io/pipefit-pro/` |
| GitHub Pages | free | only if public | as above, and the handbook transcription is then on the open internet |

**Cloudflare, once:**

1. dash.cloudflare.com, sign in with GitHub, **Workers & Pages → Create →
   Connect to Git**.
2. Pick `pipefit-pro`, branch `main`.
3. **Build command `npm run web:build`.** This is the one setting that is not
   in the repo and the one that breaks it if it is wrong: without it there is
   no `dist` to serve.
4. Save. Every push to `main` redeploys.

`wrangler.jsonc` in the repo root carries the rest. It has no `main` on
purpose: with `assets` and no script, the Worker is a pure static host and
nothing runs per request. `not_found_handling` is set to
`single-page-application`, so a refresh or a stale bookmark on any path opens
the app instead of a 404 — the whole app lives behind one page.

Validate a change to it before pushing:

```powershell
npm run web:build
npx wrangler deploy --dry-run
```

It should read the files out of `dist` and stop without deploying.

**GitHub Pages, if the repo ever goes public or the account goes Pro:**
Settings → Pages → Source: GitHub Actions, then add a repository variable
`ENABLE_PAGES` = `true` under Settings → Secrets and variables → Actions →
Variables. The workflow picks it up on the next push.

### What it gives up against the APK

| | APK | Web app |
|---|---|---|
| Offline | yes | yes, once opened once |
| Home screen icon, no browser bars | yes | yes |
| Haptics on a keypress | yes | no |
| Settings survive | always | cleared if the phone reclaims site data |
| Updates | `npm run push` | next open after a deploy |

The settings row is the only one that bites, and it is small: unit system,
fraction denominator and default pipe size, all reset to defaults if it
happens. No calculation is stored.

### Do not point it at a folder without testing

Expo bakes asset paths as `/assets/...`, from the domain root. A host that
serves the site from `/<repo>/` makes every font and icon 404, and the app
comes up bare. `tools/pwa.mjs` rewrites them relative after the export, and the
fix is verified at both a root and a subfolder. If you ever replace that
script, check a subfolder deploy before trusting it.

---

## 10. Sharing with other people

The EAS build link expires after 30 days. For anything ongoing, re-run
`npm run build:apk` and send the fresh link.

Only the first install needs a link. Once someone has the APK, `npm run push`
reaches them like it reaches you — same channel, same bundle, no new download
for them to accept.

Each recipient needs to allow installs from unknown sources once, on the app
they open the link with. After that, updates install over the top normally.

Everyone must install a build signed with the same keystore. Mixing keystores
across people means some of them can never update without uninstalling.
