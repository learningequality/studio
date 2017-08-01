#!/bin/bash
set -eo pipefail
set -x

curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
apt-get install -y python python-pip python-dev postgresql-server-dev-all postgresql-contrib postgresql-client postgresql ffmpeg nodejs python-tk libmagickwand-dev redis-server gettext openjdk-8-jdk-headless
cd /vagrant/
sudo -u postgres psql <<-DatabaseSetup
  CREATE USER learningequality with PASSWORD 'kolibri' NOSUPERUSER INHERIT NOCREATEROLE CREATEDB LOGIN NOREPLICATION NOBYPASSRLS;
  CREATE DATABASE "contentcuration" --owner="learningequality"
DatabaseSetup

# install docker
curl https://download.docker.com/linux/ubuntu/dists/xenial/pool/stable/amd64/docker-ce_17.06.0~ce-0~ubuntu_amd64.deb -O docker.deb
dpkg -i docker.deb

cd /vagrant/contentcuration

devSettings="--settings=contentcuration.dev_settings"

pip install -r ../requirements_dev.txt
pip install -r ../requirements.txt
python manage.py collectstatic_js_reverse $devSettings
python manage.py collectstatic --noinput $devSettings
python manage.py migrate $devSettings
python manage.py loadconstants $devSettings
npm install

# python manage.py calculateresources --init $devSettings
