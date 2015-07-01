# Content Curation

Django app for the Content Curation project.

### Getting the codebase and configuring your git path

* [Fork the repo](https://github.com/fle-internal/content-curation) to your own remote github repository first

* Then, clone the repository into your local files
	`git clone https://github.com/fle-internal/content-curation.git`

* Type in `git remote -v` to check what origin and upstream refer to. Make sure origin refers to your remote repository `<yourusername>/content-curation.git` and upstream refers to `fle-internal/content-curation.git`. If not, use these commands:

	upstream: 
		`git remote add fle-internal git@github.com:fle-internal/content-curation.git`
		`git remote set-url origin git@github.com:<yourusername>/content-curation.git`

	origin:
		`git remote set-url upstream git @github.com:fle-internal/content-curation.git`

### Setting up your environment

* [Download Python 2.7.10](https://www.python.org/downloads/) if you don't have it already. 

* [Install pip](https://pypi.python.org/pypi/pip) if you don't have it already.

* Set up your virtual environment
	1. `pip install virtualenv` Installs your virtual environment

	2. `virtualenv <yourfoldername>` Creates a folder for your virtual environment

	3. `source <yourfoldername>/scripts/activate` Activates your virtual environment

	IMPORTANT: Make sure you have done steps 1-3 before continuing
	4. `pip install -r requirements.txt` Installs python dependencies within your virtual environment

* Set up the database
	5. `cd contentcuration` 

	6. `manage.py makemigrations`

	7. `manage.py migrate`

* Run your server and start developing!

	8. `manage.py runserver` 

	After step 8, visit the localhost link that is presented on your console. 

### Adding files, committing, and pushing to your local repo:

When you're ready to push your work, make sure you are not in your virtual environment. Type in `deactivate` to exit your virtual environment. 

Then: 

	`git add .`
	`git commit -m " <what your code accomplished> "`
	`git push origin <branch you are working on>`

And visit the [pull request page](https://github.com/fle-internal/fle-home/pulls) to get your code in!
