#!/usr/bin/env bash
set -eu

TEXLAB_VERSION="5.25.1"
TECTONIC_VERSION="0.15.0"
BINARIES_DIR="$(cd "$(dirname "$0")/.." && pwd)/src-tauri/binaries"

mkdir -p "$BINARIES_DIR"

OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Linux)
    TEXLAB_TRIPLE="x86_64-unknown-linux-gnu"
    TECTONIC_TRIPLE="x86_64-unknown-linux-gnu"
    case "$ARCH" in
      aarch64) TEXLAB_TRIPLE="aarch64-unknown-linux-gnu" ; TECTONIC_TRIPLE="aarch64-unknown-linux-musl" ;;
      x86_64)  ;;
      *) echo "Unsupported arch: $ARCH"; exit 1 ;;
    esac
    TEXLAB_URL="https://github.com/latex-lsp/texlab/releases/download/v${TEXLAB_VERSION}/texlab-${ARCH}-linux.tar.gz"
    TECTONIC_URL="https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${TECTONIC_VERSION}/tectonic-${TECTONIC_VERSION}-${TECTONIC_TRIPLE}.tar.gz"
    ;;
  Darwin)
    TEXLAB_TRIPLE="x86_64-apple-darwin"
    TECTONIC_TRIPLE="x86_64-apple-darwin"
    TEXLAB_ARCH="x86_64"
    case "$ARCH" in
      arm64)  TEXLAB_TRIPLE="aarch64-apple-darwin" ; TECTONIC_TRIPLE="aarch64-apple-darwin" ; TEXLAB_ARCH="aarch64" ;;
      x86_64) ;;
      *) echo "Unsupported arch: $ARCH"; exit 1 ;;
    esac
    TEXLAB_URL="https://github.com/latex-lsp/texlab/releases/download/v${TEXLAB_VERSION}/texlab-${TEXLAB_ARCH}-macos.tar.gz"
    TECTONIC_URL="https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${TECTONIC_VERSION}/tectonic-${TECTONIC_VERSION}-${TECTONIC_TRIPLE}.tar.gz"
    ;;
  *)
    echo "Unsupported OS: $OS"
    exit 1
    ;;
esac

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Downloading texlab v${TEXLAB_VERSION}..."
curl -fsSL "$TEXLAB_URL" | tar -xz -C "$TMP"
mv "$TMP/texlab" "$BINARIES_DIR/texlab-${TEXLAB_TRIPLE}"
chmod +x "$BINARIES_DIR/texlab-${TEXLAB_TRIPLE}"

echo "Downloading tectonic v${TECTONIC_VERSION}..."
curl -fsSL "$TECTONIC_URL" | tar -xz -C "$TMP"
mv "$TMP/tectonic" "$BINARIES_DIR/tectonic-${TECTONIC_TRIPLE}"
chmod +x "$BINARIES_DIR/tectonic-${TECTONIC_TRIPLE}"

echo "Done. Binaries in $BINARIES_DIR:"
ls -lh "$BINARIES_DIR"
