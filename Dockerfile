from ubuntu:xenial

RUN apt-get update

RUN apt-get -y install curl
RUN curl -sL https://deb.nodesource.com/setup_4.x | bash -
RUN apt-get update
RUN apt-get -y install nodejs python python-dev python-pip gcc libpq-dev ffmpeg imagemagick ghostscript python-tk

COPY  * /contentcuration/
WORKDIR /contentcuration

RUN pip install -r requirements.txt
RUN npm install
RUN apt-get autoremove -y gcc

# generate the node bundles
RUN mkdir -p contentcuration/static/js/bundles #
RUN node build.js

WORKDIR /contentcuration/contentcuration

COPY contentcuration-entrypoint.sh /contentcuration/contentcuration/contentcuration-entrypoint.sh
RUN chmod +x ./contentcuration-entrypoint.sh
EXPOSE 8000

COPY production_settings.py contentcuration/production_settings.py

ENTRYPOINT "make"
