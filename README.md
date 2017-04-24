## LE Content Workshop

Django app for the Content Curation project.

### Getting the codebase and configuring your git path

* [Fork the repo](https://github.com/fle-internal/content-curation) to your own remote github repository first

* Then, clone the repository into your local files

	git clone https://github.com/fle-internal/content-curation.git

* Type in `git remote -v` to check what origin and upstream are tracking. Make sure origin refers to your remote repository, `yourusername/content-curation.git` and upstream refers to `fle-internal/content-curation.git`.
If not, use these commands:

	Tracking upstream:

		git remote add upstream git@github.com:fle-internal/content-curation.git
		git remote set-url upstream git@github.com:fle-internal/content-curation.git

	Tracking origin:

		git remote set-url origin git@github.com:yourusername/content-curation.git

### Setting up your environment

* [Download Python 2.7.10](https://www.python.org/downloads/) if you don't have it already.

* [Install pip](https://pypi.python.org/pypi/pip) if you don't have it already.


* [Install ffmpeg](https://ffmpeg.org/) if you don't have it already.

* Set up your virtual environment

	`pip install virtualenv` Installs your virtual environment

	`virtualenv yourfoldername` Creates a folder for your virtual environment

	`source yourfoldername/scripts/activate` Activates your virtual environment

	IMPORTANT: Make sure you have done the above steps and are inside your virtual environment before continuing on.

	`pip install -r requirements.txt` Installs python dependencies within your virtual environment

	`pip install -r requirements_dev.txt` will also install dependencies that will be helpful for development and required if you're using the `--settings=contentcuration.dev_settings` flag to run your server (see below)

* [install node](http://nodejs.org/download/) if you don't have it already.
	Install the dependencies listed in packages.json: `npm install`

* Set up the database

	1. [Install postgres](https://www.postgresql.org/download/) if you don't have it already. If you're using a package manager, this includes:
		* postgresql
		* postgresql-contrib
		* postgresql-server-dev-all (to build psycopg2)

	2. Create a `postgres` user:

	`$ sudo su postgres`

	`$ psql`

	`# CREATE USER learningequality with NOSUPERUSER INHERIT NOCREATEROLE CREATEDB LOGIN NOREPLICATION NOBYPASSRLS PASSWORD 'kolibri';`

	3. Create a database

	`# CREATE DATABASE "contentcuration" WITH TEMPLATE = template0 OWNER = "learningequality"; `

	4. Make database migrations

	`$ cd contentcuration`

	`$ python manage.py makemigrations`

	5. Migrate and finish off the database

	`$ python manage.py migrate --settings=contentcuration.dev_settings`

	`$ python manage.py loadconstants --settings=contentcuration.dev_settings`

	`$ python manage.py calculateresources --settings=contentcuration.dev_settings --init`

	`$ python manage.py collectstatic --settings=contentcuration.dev_settings`

	`$ python manage.py collectstatic_js_reverse --settings=contentcuration.dev_settings`




* Run your server and start developing! Make sure you're in your virtual environment each time before you run the server.

	`	python manage.py runserver --settings=contentcuration.dev_settings`

* Visit the localhost link that is presented on your console.

### Adding files, committing, and pushing to your local repo:

When you're ready to submit your work, make sure you are not in your virtual environment.
Type in `deactivate` to exit your virtual environment.

Then:

	`git add .`
	`git commit -m "message that says what your code accomplished"`
	`git push origin yourbranch`

And visit the [pull request page](https://github.com/fle-internal/fle-home/pulls) to get your code in!
