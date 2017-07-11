#!/bin/bash
set -eo pipefail
set -x

curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
apt-get install -y python python-pip python-dev postgresql-server-dev-all postgresql-contrib postgresql-client postgresql ffmpeg nodejs python-tk libmagickwand-dev
cd /vagrant/
sudo -u postgres psql <<-DatabaseSetup
  CREATE USER learningequality with PASSWORD 'kolibri' NOSUPERUSER INHERIT NOCREATEROLE CREATEDB LOGIN NOREPLICATION NOBYPASSRLS;
  CREATE DATABASE "contentcuration" --owner="learningequality"
DatabaseSetup

cd /vagrant/contentcuration

devSettings="--settings=contentcuration.dev_settings"

pip install -r ../requirements_dev.txt
pip install -r ../requirements.txt
python manage.py collectstatic_js_reverse $devSettings
python manage.py collectstatic --noinput $devSettings
python manage.py migrate $devSettings
python manage.py loadconstants $devSettings
npm install

python manage.py calculateresources --init $devSettings
