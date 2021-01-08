#!/usr/bin/env bash

set -xeuo pipefail

RELEASE_NAME=$1
STUDIO_APP_IMAGE_NAME=$2
STUDIO_NGINX_IMAGE_NAME=$3
STUDIO_BUCKET_NAME=$4
COMMIT_SHA=$5
PROJECT_ID=$6
DATABASE_INSTANCE_NAME=$7
DATABASE_REGION=$8

K8S_DIR=$(dirname $0)

function get_secret {
    gcloud secrets versions access --secret=$1 latest
}

helm upgrade --install \
     --namespace $RELEASE_NAME --create-namespace \
     --set studioApp.postmarkApiKey=$(get_secret postmark-api-key) \
     --set studioApp.releaseCommit=$COMMIT_SHA \
     --set studioApp.imageName=$STUDIO_APP_IMAGE_NAME \
     --set studioNginx.imageName=$STUDIO_NGINX_IMAGE_NAME \
     --set studioApp.gcs.bucketName=$STUDIO_BUCKET_NAME \
     --set studioApp.gcs.writerServiceAccountKeyBase64Encoded=$(get_secret studio-gcs-service-account-key | base64 -w 0) \
     --set settings=contentcuration.production_settings \
     --set sentry.dsnKey=$(get_secret sentry-dsn-key) \
     --set redis.password=$(get_secret redis-password) \
     --set cloudsql-proxy.credentials.username=$(get_secret postgres-username) \
     --set cloudsql-proxy.credentials.password=$(get_secret postgres-password) \
     --set cloudsql-proxy.credentials.dbname=$(get_secret postgres-dbname) \
     --set cloudsql-proxy.cloudsql.instances[0].instance=$DATABASE_INSTANCE_NAME \
     --set cloudsql-proxy.cloudsql.instances[0].project=$PROJECT_ID \
     --set cloudsql-proxy.cloudsql.instances[0].region=$DATABASE_REGION \
     --set cloudsql-proxy.cloudsql.instances[0].port=5432 \
     --set newRelic.licenseKey=$(get_secret newrelic-license-key) \
     $RELEASE_NAME $K8S_DIR
