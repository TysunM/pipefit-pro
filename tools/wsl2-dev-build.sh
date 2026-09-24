#!/usr/bin/env bash
# One-time WSL2 (Ubuntu) setup for building the PipeFit Pro development client
# on this machine instead of the EAS queue, then the build itself.
#
#   bash tools/wsl2-dev-build.sh            # set up, then build
#   bash tools/wsl2-dev-build.sh --setup    # set up only
#   bash tools/wsl2-dev-build.sh --build    # build only (setup already done)
#
# Safe to re-run: every step checks before it installs.
set -euo pipefail

SDK="$HOME/android-sdk"
CLT_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:---all}"

say() { printf '\n\033[1;36m== %s\033[0m\n' "$*"; }

setup() {
  say "System packages (JDK 17, unzip, build tools)"
  sudo apt-get update -qq
  sudo apt-get install -y -qq openjdk-17-jdk-headless unzip zip curl git build-essential >/dev/null

  say "Node"
  if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
    echo "Node 20+ is required. Install it (nvm: https://github.com/nvm-sh/nvm) and re-run." >&2
    exit 1
  fi
  node -v

  say "Android SDK at $SDK"
  mkdir -p "$SDK/cmdline-tools"
  if [ ! -x "$SDK/cmdline-tools/latest/bin/sdkmanager" ]; then
    tmp="$(mktemp -d)"
    curl -fsSL "$CLT_URL" -o "$tmp/clt.zip"
    unzip -q "$tmp/clt.zip" -d "$tmp"
    rm -rf "$SDK/cmdline-tools/latest"
    mv "$tmp/cmdline-tools" "$SDK/cmdline-tools/latest"
    rm -rf "$tmp"
  fi
  export ANDROID_HOME="$SDK" ANDROID_SDK_ROOT="$SDK"
  export JAVA_HOME="$(dirname "$(dirname "$(readlink -f "$(command -v javac)")")")"
  export PATH="$SDK/cmdline-tools/latest/bin:$SDK/platform-tools:$PATH"
  yes | sdkmanager --licenses >/dev/null 2>&1 || true
  # Expo SDK 57 / React Native 0.86 targets API 36. NDK and CMake are what the
  # native modules compile against; accepting the licenses above lets Gradle
  # fetch anything else it decides it needs.
  sdkmanager --install "platform-tools" "platforms;android-36" "build-tools;36.0.0" \
    "ndk;27.1.12297006" "cmake;3.22.1" >/dev/null

  say "Shell environment (~/.bashrc)"
  if ! grep -q 'ANDROID_HOME=' "$HOME/.bashrc"; then
    cat >> "$HOME/.bashrc" <<ENV

# Android SDK for local EAS builds
export ANDROID_HOME="$SDK"
export ANDROID_SDK_ROOT="$SDK"
export JAVA_HOME="$JAVA_HOME"
export PATH="\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools:\$PATH"
ENV
  fi

  say "EAS CLI"
  command -v eas >/dev/null || npm install -g eas-cli
  eas whoami >/dev/null 2>&1 || eas login

  say "Project dependencies"
  (cd "$REPO" && npm ci)
  echo "Setup complete."
}

build() {
  export ANDROID_HOME="$SDK" ANDROID_SDK_ROOT="$SDK"
  export JAVA_HOME="${JAVA_HOME:-$(dirname "$(dirname "$(readlink -f "$(command -v javac)")")")}"
  export PATH="$SDK/cmdline-tools/latest/bin:$SDK/platform-tools:$PATH"
  say "Building the development client locally (first run: 10-20 min, later runs much less)"
  cd "$REPO"
  npm run build:dev
  out="$REPO/pipefit-dev.apk"
  dl="$(ls -d /mnt/c/Users/*/Downloads 2>/dev/null | grep -viE '/(Public|Default|All Users)/' | head -1 || true)"
  if [ -n "$dl" ]; then
    cp "$out" "$dl/pipefit-dev.apk"
    say "APK copied to $dl/pipefit-dev.apk"
  else
    say "APK at $out"
  fi
  cat <<'NEXT'

Next:
  1. Install pipefit-dev.apk on the phone the same way as the preview APK.
  2. Phone and laptop on the same Wi-Fi. WSL2 must be reachable from the phone:
       - Windows 11: put this in C:\Users\<you>\.wslconfig, then run `wsl --shutdown` once:
             [wsl2]
             networkingMode=mirrored
         and allow inbound TCP 8081 in Windows Firewall.
       - Or skip that and start Metro with a tunnel: npx expo start --dev-client --tunnel
  3. In the repo:  npm run dev
     Open the dev client on the phone and pick the server. Every JS change now hot-reloads.
     Native changes (a new native module, app.json) need this build again.
NEXT
}

case "$MODE" in
  --setup) setup ;;
  --build) build ;;
  --all)   setup; build ;;
  *) echo "usage: $0 [--setup|--build]" >&2; exit 2 ;;
esac
