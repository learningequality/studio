###############################################################
# PRODUCTION COMMANDS #########################################
###############################################################
# These are production commands which may be invoked in deployments
#altprodserver: NUM_PROCS:=3
#altprodserver: NUM_THREADS:=5
#altprodserver: collectstatic compilemessages
#	cd contentcuration/ && gunicorn contentcuration.wsgi:application --timeout=4000 --error-logfile=/var/log/gunicorn-error.log --workers=${NUM_PROCS} --threads=${NUM_THREADS} --bind=0.0.0.0:8081 --pid=/tmp/contentcuration.pid --log-level=debug || sleep infinity

altprodserver:
	$(MAKE) -j 2 gunicornanddapneserver

gunicornanddapneserver: gunicornserver daphneserver

daphneserver:
	cd contentcuration/ && daphne -b 0.0.0.0 -p 8082 contentcuration.asgi:application

gunicornserver: NUM_PROCS:=1
gunicornserver:
	cd contentcuration/ && gunicorn contentcuration.wsgi:application --timeout=4000 --error-logfile=/var/log/gunicorn-error.log --workers=${NUM_PROCS} --bind=0.0.0.0:8081 --pid=/tmp/contentcuration.pid --log-level=debug || sleep infinity


contentnodegc:
	cd contentcuration/ && python manage.py garbage_collect

prodceleryworkers:
	cd contentcuration/ && celery -A contentcuration worker -l info --concurrency=3 --task-events

collectstatic:
	python contentcuration/manage.py collectstatic --noinput

compilemessages:
	python contentcuration/manage.py compilemessages

migrate:
	python contentcuration/manage.py migrate || true
	python contentcuration/manage.py loadconstants

filedurations:
	python contentcuration/manage.py set_file_duration

learningactivities:
	python contentcuration/manage.py set_default_learning_activities

set-tsvectors:
	python contentcuration/manage.py set_channel_tsvectors
	python contentcuration/manage.py set_contentnode_tsvectors --published

###############################################################
# END PRODUCTION COMMANDS #####################################
###############################################################

###############################################################
# I18N COMMANDS ###############################################
###############################################################
i18n-extract-frontend:
	# generate frontend messages
	yarn makemessages

i18n-extract-backend:
	# generate backend messages
	cd contentcuration && python manage.py makemessages --all

i18n-extract: i18n-extract-frontend i18n-extract-backend

i18n-transfer-context:
	yarn transfercontext

#i18n-django-compilemessages:
	# Change working directory to kolibri/ such that compilemessages
	# finds only the .po files nested there.
	#cd kolibri && PYTHONPATH="..:$$PYTHONPATH" python -m kolibri manage compilemessages

i18n-upload: i18n-extract
	python node_modules/kolibri-tools/lib/i18n/crowdin.py upload-sources ${branch}

i18n-pretranslate:
	python node_modules/kolibri-tools/lib/i18n/crowdin.py pretranslate ${branch}

i18n-pretranslate-approve-all:
	python node_modules/kolibri-tools/lib/i18n/crowdin.py pretranslate ${branch} --approve-all

i18n-convert:
	python node_modules/kolibri-tools/lib/i18n/crowdin.py convert-files

i18n-download-translations:
	python node_modules/kolibri-tools/lib/i18n/crowdin.py rebuild-translations ${branch}
	python node_modules/kolibri-tools/lib/i18n/crowdin.py download-translations ${branch}
	node node_modules/kolibri-tools/lib/i18n/intl_code_gen.js
	python node_modules/kolibri-tools/lib/i18n/crowdin.py convert-files
	# TODO: is this necessary? # Manual hack to add es language by copying es_ES to es
	# cp -r contentcuration/locale/es_ES contentcuration/locale/es

i18n-download: i18n-download-translations

i18n-update:
	echo "WARNING: i18n-update has been renamed to i18n-download"
	$(MAKE) i18n-download
	echo "WARNING: i18n-update has been renamed to i18n-download"

i18n-stats:
	python node_modules/kolibri-tools/lib/i18n/crowdin.py translation-stats ${branch}

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

export COMPOSE_PROJECT_NAME=studio_$(shell git rev-parse --abbrev-ref HEAD)

purge-postgres:
	-PGPASSWORD=kolibri dropdb -U learningequality "kolibri-studio" --port 5432 -h localhost
	PGPASSWORD=kolibri createdb -U learningequality "kolibri-studio" --port 5432 -h localhost

destroy-and-recreate-database: purge-postgres setup

devceleryworkers:
	$(MAKE) -e DJANGO_SETTINGS_MODULE=contentcuration.dev_settings prodceleryworkers

run-services:
	$(MAKE) -j 2 dcservicesup devceleryworkers

dcbuild:
	# build all studio docker image and all dependent services using docker-compose
	docker-compose build

dcup:
	# run all services except for cloudprober
	docker-compose up studio-app celery-worker

dcup-cloudprober:
	# run all services including cloudprober
	docker-compose up

dcdown:
	# run make deverver in foreground with all dependent services using docker-compose
	docker-compose down

dcclean:
	# stop all containers and delete volumes
	docker-compose down -v
	docker image prune -f

dcshell:
	# bash shell inside the (running!) studio-app container
	docker-compose exec studio-app /usr/bin/fish

dctest:
	# run backend tests inside docker, in new instances
	docker-compose run studio-app make test

dcservicesup:
	# launch all studio's dependent services using docker-compose
	docker-compose -f docker-compose.yml -f docker-compose.alt.yml up minio postgres redis

dcservicesdown:
	# stop services that were started using dcservicesup
	docker-compose -f docker-compose.yml -f docker-compose.alt.yml down
