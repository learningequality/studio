#!/bin/sh

# How to use:
# pipe a secret string into this script.
# This will output instructions on what you
# then need to add into your cloudbuild.yaml file.

gcloud kms encrypt \
    --plaintext-file=- \
    --ciphertext-file=- \
    --location=global \
    --keyring=builder-secrets \
    --key=secret-encrypter \
    | base64
