#!/bin/sh

# How to use:
# pipe a secret string into this script.
# This will output instructions on what you
# then need to add into your cloudbuild.yaml file.

KEYRING=$1
KEY=$2

gcloud kms encrypt \
    --plaintext-file=- \
    --ciphertext-file=- \
    --location=global \
    --keyring=$KEYRING \
    --key=$KEY \
    | base64
