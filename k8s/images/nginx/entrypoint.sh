#!/bin/sh

# Run yasha (a cli jinja templating engine) to generate the real nginx.conf file
sigil -f /etc/nginx/nginx.conf.jinja2 aws_s3_bucket_name=$AWS_BUCKET_NAME aws_s3_endpoint_url=$AWS_S3_ENDPOINT_URL > /etc/nginx/nginx.conf

nginx -c /etc/nginx/nginx.conf
