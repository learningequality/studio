# Using docker-compose to set up your environment

You need to install the latest [Docker edition](https://www.docker.com/community-edition).
Make sure it comes with the `docker-compose` executable.

To set up your environment, run `docker-compose up`. It will download all service images needed,
and build the dev environment for Studio under another image. Once all images are pulled, built and
containers started from them, visit `localhost:8080` in your browser, and you should see the Studio
interface!
