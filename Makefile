altprodserver: NUM_PROCS:=3
altprodserver: NUM_THREADS:=5
altprodserver: collectstatic ensurecrowdinclient downloadmessages compilemessages
	cd contentcuration/ && gunicorn contentcuration.wsgi:application --timeout=4000 --error-logfile=/var/log/gunicorn-error.log --workers=${NUM_PROCS} --threads=${NUM_THREADS} --bind=0.0.0.0:8081 --pid=/tmp/contentcuration.pid --log-level=debug || sleep infinity

contentnodegc:
	cd contentcuration/ && python manage.py garbage_collect

dummyusers:
	cd contentcuration/ && python manage.py loaddata contentcuration/fixtures/admin_user.json
	cd contentcuration/ && python manage.py loaddata contentcuration/fixtures/admin_user_token.json

prodceleryworkers:
	cd contentcuration/ && celery -A contentcuration worker -l info --concurrency=3 --task-events --without-mingle --without-gossip

prodcelerydashboard:
	# connect to the celery dashboard by visiting http://localhost:5555
	kubectl port-forward deployment/master-studio-celery-dashboard 5555

devserver:
	yarn run devserver

test:
	yarn install && yarn run unittests
	mv contentcuration/coverage.xml shared

python-test:
	pytest --cov-report=xml --cov=./
	mv ./coverage.xml shared

docker-python-test: SHELL:=/bin/bash
docker-python-test:
	# launch all studio's dependent services using docker-compose, and then run the tests
	# create a shared directory accessible from within Docker so that it can pass the
	# coverage report back for uploading.
	mkdir -p shared
	docker-compose run -v "${PWD}/shared:/shared" studio-app make collectstatic python-test -e DJANGO_SETTINGS_MODULE=contentcuration.test_settings
	bash <(curl -s https://codecov.io/bash)
	rm -rf shared

endtoendtest: SHELL:=/bin/bash
endtoendtest:
	# launch all studio's dependent services using docker-compose, and then run the tests
	# create a shared directory accessible from within Docker so that it can pass the
	# coverage report back for uploading.
	mkdir -p shared
	docker-compose run -v "${PWD}/shared:/shared" studio-app make collectstatic test -e DJANGO_SETTINGS_MODULE=contentcuration.test_settings
	bash <(curl -s https://codecov.io/bash)
	rm -rf shared


collectstatic:
	python contentcuration/manage.py collectstatic --noinput

migrate:
	python contentcuration/manage.py migrate || true
	python contentcuration/manage.py loadconstants

ensurecrowdinclient:
	ls -l crowdin-cli.jar || curl -L https://storage.googleapis.com/le-downloads/crowdin-cli/crowdin-cli.jar -o crowdin-cli.jar

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
uploadmessages: ensurecrowdinclient
	java -jar crowdin-cli.jar upload sources -b `git rev-parse --abbrev-ref HEAD`

# we need to depend on makemessages, since CrowdIn requires the en folder to be populated
# in order for it to properly extract strings
downloadmessages: ensurecrowdinclient makemessages
	java -jar crowdin-cli.jar download -b `git rev-parse --abbrev-ref HEAD` || true
	# Manual hack to add es language by copying es_ES to es
	cp -r contentcuration/locale/es_ES contentcuration/locale/es

compilemessages:
	python contentcuration/manage.py compilemessages

# When using apidocs, this should clean out all modules
clean-docs:
	$(MAKE) -C docs clean

docs: clean-docs
	# Adapt to apidocs
	# sphinx-apidoc -d 10 -H "Python Reference" -o docs/py_modules/ kolibri kolibri/test kolibri/deployment/ kolibri/dist/
	$(MAKE) -C docs html

setup:
	python contentcuration/manage.py setup

export COMPOSE_PROJECT_NAME=studio_$(shell git rev-parse --abbrev-ref HEAD)

purge-postgres:
	-PGPASSWORD=kolibri dropdb -U learningequality "kolibri-studio" --port 5432 -h localhost
	PGPASSWORD=kolibri createdb -U learningequality "kolibri-studio" --port 5432 -h localhost

destroy-and-recreate-database: purge-postgres setup

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

export COMPOSE_STUDIO_APP = ${COMPOSE_PROJECT_NAME}_studio-app_1
dcshell:
	# bash shell inside studio-app container
	docker exec -ti ${COMPOSE_STUDIO_APP} /usr/bin/fish

dctest: endtoendtest
	# launch all studio's dependent services using docker-compose, and then run the tests
	echo "Finished running  make test -e DJANGO_SETTINGS_MODULE=contentcuration.test_settings"

dcservicesup:
	# launch all studio's dependent services using docker-compose
	docker-compose -f docker-compose.yml -f docker-compose.alt.yml up minio postgres redis

dcservicesdown:
	# stop services that were started using dcservicesup
	docker-compose -f docker-compose.yml -f docker-compose.alt.yml down
