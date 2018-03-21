Git repository setup
====================

We use `develop`

### Get the code and configuring git remotes

  - Fork the [studio repo](https://github.com/learningequality/studio) to create
    a copy of the studio repository under your own username on github.
    Note: the code examples below assume your username is `yourusername`, please
    modify and replace with your own user name before running the commands.

  - Clone your fork of the repository to your local machine:
         
        cd MyCodingProjectsDir
        git clone git@github.com:yourusername/studio.git
  
  - Add the main Learning Equality studio repository as the `upstream` remote:
    
        cd studio
        git remote add upstream git@github.com:learningequality/studio.git
    
    Run the command `git remote -v` to confirm that your repo now has two remotes:
    Make sure `origin` refers to your remote repository, `yourusername/studio.git`
    and `upstream` refers to `learningequality/studio.git`.

  - To complete your git setup, you must setup your local develop branch to track
    changes from the `upstream/develop` branch, so that you will always have the
    latest version of the development code. Run the following commands:
    
        git fetch upstream
        git checkout -b tmp
        git branch -D develop
        git checkout -t upstream/develop
        git branch -D tmp
    
    To verify the above steps worked correctly, examine the file `.git/config`
    and confirm that the remote listed for the `develop` branch is `upstream`.

  - From now on, when you want to update your local develop branch you can run:
        
        git checkout develop
        git pull
        
    Since your branch `develop` is setup to track `upstream/develop` you don't
    need to specify remote and branch name arguments to the git pull command.



### Branches, files, commits, and pull requests

You should not be making changes to the `develop` branch directly. Instead, you
should use separate git branch for each code contribution you want to make.
Use short, descriptive name for the branches, e.g., `fix/problem` for a bugfix,
`feature/smthnew` for a new feature, or `docs/someinfo`.

Suppose you want to add support for content "Z" to Kolibri Studio. Here are the
sequence of commands you'll need to use, to setup a feature branch for this:

    git checkout develop
    git pull  # to make sure your develop branch is up to date with upstream/develop
    git checkout -b feature/contentZ

Next, make all the edits and changes to the code on the branch `feature/contentZ`.
After modifying some files, you can add and commit them using:

    git add some/specific/file.py   # add one file
    git add .                       # add all files changed
    git commit -m"message that explains what your code accomplished"

Running `git add` and `git commit` saves the changes to your local git repository.
You need to run `git push` to push your changes to your github repository.
The first time you push, you'll need to run the command:

    git push --set-upstream origin feature/contentZ

After this command, the link between your local branch `feature/contentZ` and the
remote branch `feature/contentZ` inside `yourusername/studio.git` will be established
so any subsequent commits can be pushed using:

    git push

If you're ever confused about which commits exist on your local branch, and on
the remote branch, run this command to show a graphical overview:

    git log --oneline --all --graph

Once you feel your work on the Content Z feature is complete, you can open a pull request
using the "New pull request" button on [this page](https://github.com/learningequality/studio/pulls).
Choose the `develop` branch as the base target for your pull request.
This will start the code review process and get your code merged in!



Further reading
---------------
To learn more about the git, pull request, rebasing, and coding conventions used at LE,
check out [this doc](https://docs.google.com/document/d/10Ynlk6kJFcW3UP9HEVBBXYudcFnSLzMjaBXF_9xuERU/edit?usp=sharing).

