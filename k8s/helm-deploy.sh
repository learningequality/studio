#!/bin/bash

set -e

RELEASENAME=$1
BUCKET=$2
COMMIT=$3
POSTMARK_KEY=$4
PROBER_NEWRELIC_KEY=$5
PROBER_NEWRELIC_ACCOUNT_ID=$6
POSTGRES_USER=$7
POSTGRES_DATABASE=$8
POSTGRES_PASSWORD=$9
GCLOUD_PROXY_HOSTNAME=${10}
GCS_SERVICE_ACCOUNT_JSON=${11}
PROJECT_ID=${12}

if [ "${13}" ]
then
    IS_PRODUCTION=true
else
    IS_PRODUCTION=false
fi

GDRIVE_SERVICE_ACCOUNT_JSON=${14}
SENTRY_DSN_KEY=${15}

helm upgrade --install $RELEASENAME . \
     -f values-prod-config.yaml \
     --set studioApp.imageName=gcr.io/$PROJECT_ID/learningequality-studio-app:$COMMIT \
     --set studioNginx.imageName=gcr.io/$PROJECT_ID/learningequality-studio-nginx:$COMMIT \
     --set studioProber.imageName=gcr.io/$PROJECT_ID/learningequality-studio-prober:$COMMIT \
     --set studioApp.releaseCommit=$COMMIT \
     --set bucketName=$BUCKET \
     --set studioApp.postmarkApiKey=$POSTMARK_KEY \
     --set postgresql.postgresUser=$POSTGRES_USER \
     --set postgresql.postgresDatabase=$POSTGRES_DATABASE \
     --set postgresql.postgresPassword=$POSTGRES_PASSWORD \
     --set postgresql.externalCloudSQL.proxyHostName=$GCLOUD_PROXY_HOSTNAME \
     --set minio.externalGoogleCloudStorage.gcsKeyJson=$(base64 $GCS_SERVICE_ACCOUNT_JSON --wrap=0) \
     --set productionIngress=$IS_PRODUCTION \
     --set studioApp.gDrive.keyJson=$(base64 $GDRIVE_SERVICE_ACCOUNT_JSON  --wrap=0) \
     --set sentry.dsnKey=$(echo "$SENTRY_DSN_KEY" | base64 --wrap=0) \
     --timeout 1500 \
     --set-string studioProber.newrelicKey=$PROBER_NEWRELIC_KEY \
     --set-string studioProber.newrelicAccountId=$PROBER_NEWRELIC_ACCOUNT_ID  # use set-string to resolve the issue https://github.com/helm/helm/issues/1707
