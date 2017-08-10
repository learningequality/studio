prodserver: collectstatic ensurecrowdinclient downloadmessages compilemessages
	cd contentcuration/ && gunicorn contentcuration.wsgi:application --timeout=500 --error-logfile=/var/log/gunicorn-error.log --workers=3 --bind=0.0.0.0:8000 --pid=/tmp/contentcuration.pid --log-level=debug || sleep infinity

collectstatic:
	python contentcuration/manage.py collectstatic --noinput
	python contentcuration/manage.py collectstatic_js_reverse
	python contentcuration/manage.py loadconstants

migrate:
	python contentcuration/manage.py migrate

ensurecrowdinclient:
	ls -l crowdin-cli.jar || curl -L https://crowdin.com/downloads/crowdin-cli.jar > crowdin-cli.jar # make sure we have the official crowdin cli client

makemessages:
	# generate frontend messages
	npm run makemessages
	# generate backend messages
	python contentcuration/manage.py makemessages

uploadmessages: ensurecrowdinclient
	java -jar crowdin-cli.jar upload sources

# we need to depend on makemessages, since CrowdIn requires the en folder to be populated
# in order for it to properly extract strings
downloadmessages: makemessages
	java -jar crowdin-cli.jar download

compilemessages:
	python contentcuration/manage.py compilemessages


devserver:
	cd contentcuration && python manage.py runserver --settings=contentcuration.dev_settings 0.0.0.0:8000

vagrantdevserver:
	echo "Server to run on 192.168.31.9:8000"
	vagrant ssh -c 'cd /vagrant/contentcuration;python manage.py runserver --settings=contentcuration.dev_settings 0.0.0.0:8000;cd -;'

vagrantceleryworker:
	echo "Starting up a celery worker"
<<<<<<< HEAD
	vagrant ssh -c 'cd /vagrant/contentcuration;celery -A contentcuration worker -l info;cd -;'
=======
	vagrant ssh -c 'cd /vagrant/contentcuration;DJANGO_SETTINGS_MODULE=contentcuration.dev_settings celery -A contentcuration worker -l info;cd -;'
>>>>>>> 0ef83fd3166314270419676ad18eb6688363d8e2
