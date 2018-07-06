#!/bin/bash

set -e

BRANCH=$1
BUCKET=$2
COMMIT=$3
POSTMARK_KEY=$4
POSTGRES_USER=$5
POSTGRES_DATABASE=$6
POSTGRES_PASSWORD=$7
GCLOUD_PROXY_HOSTNAME=$8
GCS_SERVICE_ACCOUNT_JSON=$9

helm upgrade --install $BRANCH . \
     -f values-prod-config.yaml \
     --set studioApp.imageName=gcr.io/$PROJECT_ID/learningequality-studio-app:$COMMIT \
     --set studioNginx.imageName=gcr.io/$PROJECT_ID/learningequality-studio-nginx:$COMMIT \
     --set studioApp.postmarkApiKey=$POSTMARK_KEY \
     --set postgresql.postgresUser=$POSTGRES_USER \
     --set postgresql.postgresDatabase=$POSTGRES_DATABASE \
     --set postgresql.postgresPassword=$POSTGRES_PASSWORD \
     --set postgresql.externalCloudSQL.proxyHostName=$GCLOUD_PROXY_HOSTNAME \
     --set minio.externalGoogleCloudStorage.gcsKeyJson=$(base64 $GCS_SERVICE_ACCOUNT_JSON --wrap=0)
