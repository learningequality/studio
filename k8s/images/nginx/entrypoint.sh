#!/bin/sh

if [ -z "$AWS_BUCKET_NAME" ]; then
  echo "AWS_BUCKET_NAME is not set. Exiting..."
  exit 1
fi

CONTENT_CONFIG="/etc/nginx/includes/content/$AWS_BUCKET_NAME.conf"

# if content proxy config with the same name as the bucket does not exist, use the default one
if [ ! -f "$CONTENT_CONFIG" ]; then
  CONTENT_CONFIG="/etc/nginx/includes/content/default.conf"
fi

echo "Using content proxy config: $CONTENT_CONFIG"
cp "$CONTENT_CONFIG" /etc/nginx/includes/content.conf

nginx -c /etc/nginx/nginx.conf
