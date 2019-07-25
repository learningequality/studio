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
	cd contentcuration/ && celery -A contentcuration worker -l info --concurrency=3 --without-mingle --without-gossip

prodcelerydashboard:
	# connect to the celery dashboard by visiting http://localhost:5555
	kubectl port-forward deployment/master-studio-celery-dashboard 5555

devserver:
	yarn run devserver

test:
	yarn install && yarn run unittests
	mv contentcuration/coverage.xml shared

endtoendtest: SHELL:=/bin/bash
endtoendtest:
	# launch all studio's dependent services using docker-compose, and then run the tests
	# create a shared directory accessible from within Docker so that it can pass the
	# coverage report back for uploading.
	mkdir -p shared
	docker-compose run -v "${PWD}/shared:/shared" studio-app make test -e DJANGO_SETTINGS_MODULE=contentcuration.test_settings
	bash <(curl -s https://codecov.io/bash)
	rm -rf shared


collectstatic:
	python contentcuration/manage.py collectstatic --noinput
	python contentcuration/manage.py collectstatic_js_reverse

migrate:
	python contentcuration/manage.py migrate || true
	python contentcuration/manage.py loadconstants

ensurecrowdinclient:
	ls -l crowdin-cli.jar || curl -L https://storage.googleapis.com/le-downloads/crowdin-cli/crowdin-cli.jar -o crowdin-cli.jar

makemessages:
	# generate frontend messages
	npm run makemessages
	# generate backend messages
	python contentcuration/manage.py makemessages
	# workaround for Django 1.11 makemessages spitting out an invalid English translation file
	python bin/fix_django_messages.py

uploadmessages: ensurecrowdinclient
	java -jar crowdin-cli.jar upload sources

# we need to depend on makemessages, since CrowdIn requires the en folder to be populated
# in order for it to properly extract strings
downloadmessages: ensurecrowdinclient makemessages
	java -jar crowdin-cli.jar download || true

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
