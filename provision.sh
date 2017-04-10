#!/bin/bash
set -eo pipefail
set -x

# run as root
curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
apt-get install -y python python-pip python-dev postgresql-server-dev-all postgresql-contrib postgresql-client postgresql ffmpeg
apt-get install -y nodejs
cd /vagrant/
sudo -u postgres psql <<-DatabaseSetup
  CREATE USER learningequality with PASSWORD 'kolibri' NOSUPERUSER INHERIT NOCREATEROLE CREATEDB LOGIN NOREPLICATION NOBYPASSRLS;
  CREATE DATABASE "content-curation" --owner="learningequality"
DatabaseSetup



cd /vagrant/contentcuration

devSettings="--settings=contentcuration.dev_settings"

# run as user
su ubuntu <<-UserSetup
  pip install --user -r ../requirements_dev.txt
  pip install --user -r ../requirements.txt
  python manage.py collectstatic_js_reverse $devSettings
  python manage.py collectstatic --noinput $devSettings
  python manage.py loadconstants $devSettings
  python manage.py migrate $devSettings
UserSetup

# python manage.py calculateresources --init $devSettings