#!/usr/bin/env sh
# This script creates a Traefik load balancer, a single
# set of servers that we'll use to multiplex between different
# versions of studio.
#
# We want to use this vs. Google Cloud native load balancers, b/c
# each gcloud lb is $20/month. Using an internal traefik load balancer
# means we only need a static IP, and traefik does the load balancing.

# Arguments:
# $1: The Helm release name. You'll see this name inside Kubernetes.
# $2: the load balancer's external IP (xxx.xxx.xxx.xxx). Make sure to reserve this first on GCP.
# $3: The Cloudflare email address. Used to perform automated letsencrypt verification.
# $4: The API key for the given Cloudflare email.


set -xe

helm init

helm upgrade $1 stable/traefik --namespace kube-system \
     --set loadBalancerIP=$2 \
     --set gzip.enabled=false \
     --set acme.enabled=true \
     --set ssl.enabled=true \
     --set acme.challengeType=dns-01 \
     --set acme.dnsProvider.name=cloudflare \
     --set acme.dnsProvider.cloudflare.CLOUDFLARE_EMAIL=$3 \
     --set acme.dnsProvider.cloudflare.CLOUDFLARE_API_KEY=$4 \
     --set acme.email='admins@learningequality.org' \
     --set cpuRequest=1000m \
     --set memoryRequest=1Gi \
     --set cpuLimit=2000m \
     --set memoryLimit=2Gi \
     --set acme.staging=false \
     --set dashboard.enabled=true \
     --set dashboard.domain=traefik-lb-ui.cd.learningequality.org \
     -i
