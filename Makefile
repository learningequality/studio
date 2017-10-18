prodserver: collectstatic ensurecrowdinclient downloadmessages compilemessages
	cd contentcuration/ && gunicorn contentcuration.wsgi:application --timeout=500 --error-logfile=/var/log/gunicorn-error.log --workers=3 --bind=0.0.0.0:8000 --pid=/tmp/contentcuration.pid --log-level=debug || sleep infinity

collectstatic:
	python contentcuration/manage.py collectstatic --noinput
	python contentcuration/manage.py collectstatic_js_reverse
	python contentcuration/manage.py loadconstants

migrate:
	python contentcuration/manage.py migrate

ensurecrowdinclient:
        curl -L https://storage.googleapis.com/le-downloads/crowdin-cli/crowdin-cli.jar > crowdin-cli.jar

makemessages:
	# generate frontend messages
	npm run makemessages
	# generate backend messages
	python contentcuration/manage.py makemessages

uploadmessages: ensurecrowdinclient
	java -jar crowdin-cli.jar upload sources

# we need to depend on makemessages, since CrowdIn requires the en folder to be populated
# in order for it to properly extract strings
downloadmessages: ensurecrowdinclient makemessages
	java -jar crowdin-cli.jar download

compilemessages:
	python contentcuration/manage.py compilemessages


devserver:
	cd contentcuration && python manage.py runserver --settings=contentcuration.dev_settings 0.0.0.0:8000

vagrantdevserver:
	echo "Server to run on 192.168.31.9:8000"
	vagrant ssh -c 'cd /vagrant/contentcuration;python manage.py runserver --settings=contentcuration.dev_settings 0.0.0.0:8000;cd -;'

vagrantceleryworkers:
	echo "Starting up celery workers"
	vagrant ssh -c 'cd /vagrant/contentcuration;'
