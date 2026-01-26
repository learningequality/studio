# standalone install method
DOCKER_COMPOSE = docker-compose

# support new plugin installation for docker-compose
ifeq (, $(shell which docker-compose))
DOCKER_COMPOSE = docker compose
endif

###############################################################
# PRODUCTION COMMANDS #########################################
###############################################################
# These are production commands which may be invoked in deployments
altprodserver: NUM_PROCS:=3
altprodserver: NUM_THREADS:=5
altprodserver: collectstatic compilemessages
	cd contentcuration/ && gunicorn contentcuration.wsgi:application --timeout=4000 --error-logfile=/var/log/gunicorn-error.log --workers=${NUM_PROCS} --threads=${NUM_THREADS} --bind=0.0.0.0:8081 --pid=/tmp/contentcuration.pid --log-level=debug || sleep infinity

prodceleryworkers:
	cd contentcuration/ && celery -A contentcuration worker -l info --concurrency=3 --task-events

collectstatic:
	python contentcuration/manage.py collectstatic --noinput

compilemessages:
	python contentcuration/manage.py compilemessages

migrate:
	python contentcuration/manage.py migrate || true
	python contentcuration/manage.py loadconstants

# This is a special command that is we'll reuse to run data migrations outside of the normal
# django migration process. This is useful for long running migrations which we don't want to block
# the CD build. Do not delete!
# Procedure:
# 1) Add a new management command for the migration
# 2) Call it here
# 3) Perform the release
# 4) Remove the management command from this `deploy-migrate` recipe
# 5) Repeat!
deploy-migrate:
	python contentcuration/manage.py backfill_channel_license_audits

contentnodegc:
	python contentcuration/manage.py garbage_collect

filedurations:
	python contentcuration/manage.py set_file_duration

learningactivities:
	python contentcuration/manage.py set_default_learning_activities

set-tsvectors:
	python contentcuration/manage.py set_channel_tsvectors
	python contentcuration/manage.py set_contentnode_tsvectors --published

reconcile:
	python contentcuration/manage.py reconcile_publishing_status
	python contentcuration/manage.py reconcile_change_tasks

###############################################################
# END PRODUCTION COMMANDS #####################################
###############################################################

###############################################################
# I18N COMMANDS ###############################################
###############################################################
i18n-extract-frontend:
	# generate frontend messages
	pnpm makemessages

i18n-extract-backend:
	# generate backend messages
	cd contentcuration && python manage.py makemessages --all

i18n-extract: i18n-extract-frontend i18n-extract-backend

i18n-transfer-context:
	pnpm transfercontext

i18n-django-compilemessages:
	# Change working directory to contentcuration/ such that compilemessages
	# finds only the .po files nested there.
	cd contentcuration && python manage.py compilemessages

i18n-upload: i18n-extract
	python node_modules/kolibri-tools/lib/i18n/crowdin.py upload-sources ${branch}

i18n-pretranslate:
	python node_modules/kolibri-tools/lib/i18n/crowdin.py pretranslate ${branch}

i18n-pretranslate-approve-all:
	python node_modules/kolibri-tools/lib/i18n/crowdin.py pretranslate ${branch} --approve-all

i18n-download-translations:
	python node_modules/kolibri-tools/lib/i18n/crowdin.py rebuild-translations ${branch}
	python node_modules/kolibri-tools/lib/i18n/crowdin.py download-translations ${branch}
	pnpm exec kolibri-tools i18n-code-gen -- --output-dir ./contentcuration/contentcuration/frontend/shared/i18n
	$(MAKE) i18n-django-compilemessages
	pnpm exec kolibri-tools i18n-create-message-files -- --namespace contentcuration --searchPath ./contentcuration/contentcuration/frontend

i18n-download: i18n-download-translations

i18n-download-glossary:
	python node_modules/kolibri-tools/lib/i18n/crowdin.py download-glossary

i18n-upload-glossary:
	python node_modules/kolibri-tools/lib/i18n/crowdin.py upload-glossary

###############################################################
# END I18N COMMANDS ###########################################
###############################################################

# When using apidocs, this should clean out all modules
clean-docs:
	$(MAKE) -C docs clean

docs: clean-docs
	# Adapt to apidocs
	# sphinx-apidoc -d 10 -H "Python Reference" -o docs/py_modules/ kolibri kolibri/test kolibri/deployment/ kolibri/dist/
	$(MAKE) -C docs html

setup:
	python contentcuration/manage.py setup

################################################################
# DEVELOPMENT COMMANDS #########################################
################################################################

test:
	pytest

dummyusers:
	cd contentcuration/ && python manage.py loaddata contentcuration/fixtures/admin_user.json
	cd contentcuration/ && python manage.py loaddata contentcuration/fixtures/admin_user_token.json

hascaptions:
	python contentcuration/manage.py set_orm_based_has_captions

BRANCH_NAME := $(shell git rev-parse --abbrev-ref HEAD | sed 's/[^a-zA-Z0-9_-]/-/g')

export COMPOSE_PROJECT_NAME=studio_$(BRANCH_NAME)

purge-postgres: .docker/pgpass
	-PGPASSFILE=.docker/pgpass dropdb -U learningequality "kolibri-studio" --port 5432 -h localhost
	PGPASSFILE=.docker/pgpass createdb -U learningequality "kolibri-studio" --port 5432 -h localhost

destroy-and-recreate-database: purge-postgres setup

devceleryworkers:
	$(MAKE) -e DJANGO_SETTINGS_MODULE=contentcuration.dev_settings prodceleryworkers

run-services:
	$(MAKE) -j 2 dcservicesup devceleryworkers

.docker/minio:
	mkdir -p $@

.docker/postgres:
	mkdir -p $@

.docker/pgpass:
	echo "localhost:5432:kolibri-studio:learningequality:kolibri" > $@
	chmod 600 $@

.docker/postgres/init.sql: .docker/pgpass
	# assumes postgres is running in a docker container
	PGPASSFILE=.docker/pgpass pg_dump --host localhost --port 5432 --username learningequality --dbname "kolibri-studio" --exclude-table-data=contentcuration_change --file $@

dcbuild:
	# build all studio docker image and all dependent services using docker-compose
	$(DOCKER_COMPOSE) build

dcup: .docker/minio .docker/postgres
	# run all services
	$(DOCKER_COMPOSE) up

dcdown:
	# run make deverver in foreground with all dependent services using $(DOCKER_COMPOSE)
	$(DOCKER_COMPOSE) down

dcclean:
	# stop all containers and delete volumes
	$(DOCKER_COMPOSE) down -v
	docker image prune -f

dcshell:
	# bash shell inside the (running!) studio-app container
	$(DOCKER_COMPOSE) exec studio-app /usr/bin/fish

dcpsql: .docker/pgpass
	PGPASSFILE=.docker/pgpass psql --host localhost --port 5432 --username learningequality --dbname "kolibri-studio"

dctest: .docker/minio .docker/postgres
	# run backend tests inside docker, in new instances
	$(DOCKER_COMPOSE) run studio-app make test

dcservicesup: .docker/minio .docker/postgres
	# launch all studio's dependent services using docker-compose
	$(DOCKER_COMPOSE) -f docker-compose.yml -f docker-compose.alt.yml up minio postgres redis

dcservicesdown:
	# stop services that were started using dcservicesup
	$(DOCKER_COMPOSE) -f docker-compose.yml -f docker-compose.alt.yml down
