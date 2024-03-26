#!/bin/sh
set -eou pipefail

export SIGIL_VERSION=0.10.1
export OS=`sh -c "uname -s | tr '[:upper:]' '[:lower:]'"`
export ARCH=`sh -c "uname -m | tr '[:upper:]' '[:lower:]' | sed 's/aarch64/arm64/' | sed 's/x86_64/amd64/'"`


curl -L "https://github.com/gliderlabs/sigil/releases/download/v${SIGIL_VERSION}/gliderlabs-sigil_${SIGIL_VERSION}_${OS}_${ARCH}.tgz" | tar -zxC /tmp
mv /tmp/gliderlabs-sigil-${ARCH} /tmp/sigil
