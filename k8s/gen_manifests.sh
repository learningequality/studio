#!/bin/sh

# statically generate the manifests to stdout

set -e

KSONNET_VERSION=0.9.2

# Download the ks executable first
curl -L https://github.com/ksonnet/ksonnet/releases/download/v`echo $KSONNET_VERSION`/ks_`echo $KSONNET_VERSION`_linux_amd64.tar.gz -o ks.tar.gz
tar xf ks.tar.gz ks_`echo $KSONNET_VERSION`_linux_amd64/ks
mv ks_`echo $KSONNET_VERSION`_linux_amd64/ks ./ks

./ks show dev
