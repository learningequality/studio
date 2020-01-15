#!/bin/bash

mkdir -p /data
chown minio-user:minio-user /data

service minio stop

echo "MINIO_VOLUMES=\"/data\"" > /etc/default/minio

for var in "$@"
do
  echo "$var=\"${!var}\"" >> /etc/default/minio
done

service minio start
