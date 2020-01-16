#!/bin/bash

apt-get update
apt-get install -y curl ca-certificates gnupg
curl https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -

echo "deb http://apt.postgresql.org/pub/repos/apt bionic-pgdg main" > /etc/apt/sources.list.d/pgdg.list
apt-get update
apt-get install -y postgresql-9.6

sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/9.6/main/postgresql.conf
echo "host    all    all    10.0.2.0/24    md5" >> /etc/postgresql/9.6/main/pg_hba.conf
service postgresql restart

echo "
DROP DATABASE IF EXISTS \"$POSTGRES_DB\";

DROP ROLE IF EXISTS \"$POSTGRES_USER\";

CREATE USER $POSTGRES_USER
  WITH NOSUPERUSER INHERIT NOCREATEROLE CREATEDB LOGIN NOREPLICATION NOBYPASSRLS
  PASSWORD '$POSTGRES_PASSWORD'
;

CREATE DATABASE \"$POSTGRES_DB\"
  WITH TEMPLATE = template0
  ENCODING = 'UTF8'
  OWNER = '$POSTGRES_USER'
;
" > /tmp/postgres_init.sql

su postgres -c 'psql -f /tmp/postgres_init.sql'
