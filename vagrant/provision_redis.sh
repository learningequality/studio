#!/bin/bash

apt-get update
apt-get -y install redis-server

sed -i 's/^bind 127.0.0.1 ::1/bind 127.0.0.1 10.0.2.15/g' /etc/redis/redis.conf

service redis-server restart
