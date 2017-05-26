prodserver: collectstatic
	cd contentcuration/ && gunicorn contentcuration.wsgi:application --timeout=500 --error-logfile=/var/log/gunicorn-error.log --workers=3 --bind=0.0.0.0:8000 --pid=/tmp/contentcuration.pid --log-level=debug || sleep infinity

collectstatic:
	python contentcuration/manage.py collectstatic --noinput
	python contentcuration/manage.py collectstatic_js_reverse
	python contentcuration/manage.py loadconstants


migrate:
	python contentcuration/manage.py migrate

devserver:
	cd contentcuration && python manage.py runserver --settings=contentcuration.dev_settings 0.0.0.0:8000

vagrantdevserver:
	echo "Server to run on 192.168.31.9:8000"
	vagrant ssh -c 'cd /vagrant/contentcuration;python manage.py runserver --settings=contentcuration.dev_settings 0.0.0.0:8000;cd -;'
