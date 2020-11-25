#!/usr/bin/env bash

set -euo pipefail

RELEASE_NAME=$1
STUDIO_APP_IMAGE_NAME=$2
STUDIO_NGINX_IMAGE_NAME=$3
STUDIO_BUCKET_NAME=$4

K8S_DIR=$(dirname $0)

function get_secret {
    gcloud beta secrets versions access --secret $1 latest
}

# helm template \
helm upgrade --install \
     --namespace $RELEASE_NAME --create-namespace \
     --set studioApp.postmarkApiKey=$(get_secret postmark-api-key) \
     --set studioApp.releaseCommit=$(git rev-parse HEAD) \
     --set studioApp.imageName=$STUDIO_APP_IMAGE_NAME \
     --set studioNginx.imageName=$STUDIO_NGINX_IMAGE_NAME \
     --set studioApp.gcs.bucketName=$4 \
     --set settings=contentcuration.production_settings \
     --set sentry.dsnKey=$(get_secret sentry-dsn-key) \
     --set redis.password=$(get_secret redis-password) \
     --set cloudsql-proxy.credentials.username=$(get_secret postgres-username) \
     --set cloudsql-proxy.credentials.password=$(get_secret postgres-password) \
     --set cloudsql-proxy.credentials.dbname=$(get_secret postgres-dbname) \
     $RELEASE_NAME $K8S_DIR
