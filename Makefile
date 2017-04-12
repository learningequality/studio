prodserver: collectstatic
	cd contentcuration/ && gunicorn contentcuration.wsgi:application --workers=3 --bind=0.0.0.0:8000 --pid=/tmp/contentcuration.pid --log-level=debug || sleep infinity

collectstatic:
	python contentcuration/manage.py collectstatic --noinput
	python contentcuration/manage.py collectstatic_js_reverse
	python contentcuration/manage.py loadconstants


migrate:
	python contentcuration/manage.py migrate

devserver:
	python contentcuration/manage.py runserver --settings=contentcuration.dev_settings
