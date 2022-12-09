#!/usr/bin/env sh
# Arguments:
# $1: The Helm release name. You'll see this name inside Kubernetes.
# $2: the path to the service account JSON file that has access to Cloud SQL.
# $3: Cloud SQL instance name
# $4: GCP project id
# $5: Cloud SQL region

set -xe

# Install the helm server side component
helm init

# Install the Global cluster sql proxy. Create one for each
# Cloud SQL database you want to connect to.
helm upgrade $1 stable/gcloud-sqlproxy --namespace sqlproxy \
    --set serviceAccountKey="$(cat $2 | base64)" \
    --set cloudsql.instances[0].instance=$3 \
    --set cloudsql.instances[0].project=$4 \
    --set cloudsql.instances[0].region=$5 \
    --set cloudsql.instances[0].port=5432 -i
