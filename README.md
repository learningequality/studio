## LE Content Workshop

Django app for the Content Curation project.

### Getting the codebase and configuring your git path

* [Fork the repo](https://github.com/fle-internal/content-curation) to your own remote github repository first

* Then, clone the repository into your local files

	git clone https://github.com/fle-internal/content-curation.git

* Type in `git remote -v` to check what origin and upstream are tracking. Make sure origin refers to your remote repository, `yourusername/content-curation.git` and upstream refers to `fle-internal/content-curation.git`.
If not, use these commands:

	Tracking upstream:

	`git remote add upstream git@github.com:fle-internal/content-curation.git`
	`git remote set-url upstream git@github.com:fle-internal/content-curation.git`

	Tracking origin:

	`git remote set-url origin git@github.com:yourusername/content-curation.git`

### Running your server inside of vagrant

We've set up a `vagrant` virtual machine to simplify the development process!

* Make sure you've installed:
	- vagrant
	- virtualbox (or any other virtual machine software. You're on your own there.)


* set up your machine (this will take a while)

	`vagrant up`

* Run the server

	`make devserver`

	see the other `make` commands in `Makefile`.

* Turn off the machine when you're done:

	`vagrant halt`

### Setting up your environment manually

Note: If you're running ubuntu, you can use the `provision.sh` script that we use in the vagrantfile to do the entire process for you. You'll need sudo!

* You're going to need the following packages to run the server:
	- python (2.7)
	- python-pip
	- python-dev
	- postgresql-server-dev-all
	- postgresql-contrib
	- postgresql-client
	- postgresql
	- ffmpeg
	- nodejs
	- python-tk
	- libmagickwand-dev


* If you're on ubuntu, you can use `apt` to install the packages:

`apt-get install -y python python-pip python-dev postgresql-server-dev-all postgresql-contrib postgresql-client postgresql ffmpeg nodejs python-tk libmagickwand-dev`

* Set up your virtual environment

	`pip install virtualenv` Installs your virtual environment

	`virtualenv yourfoldername` Creates a folder for your virtual environment

	`source yourfoldername/scripts/activate` Activates your virtual environment

	IMPORTANT: Make sure you have done the above steps and are inside your virtual environment before continuing on.

	`pip install -r requirements.txt` Installs python dependencies within your virtual environment

	`pip install -r requirements_dev.txt` will also install dependencies that will be helpful for development and required if you're using the `--settings=contentcuration.dev_settings` flag to run your server (see below)

*	Install the javascript dependencies listed in packages.json:

	`npm install`

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

	git add .
	git commit -m "message that says what your code accomplished"
	git push origin yourbranch

And visit the [pull request page](https://github.com/fle-internal/fle-home/pulls) to get your code in!
