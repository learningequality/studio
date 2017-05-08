from ubuntu:xenial

RUN apt-get update

RUN apt-get -y install curl
RUN curl -sL https://deb.nodesource.com/setup_4.x | bash -
RUN apt-get update
RUN apt-get -y install nodejs python python-dev python-pip gcc libpq-dev ffmpeg imagemagick ghostscript python-tk make git

COPY  . /contentcuration/
WORKDIR /contentcuration

RUN pip install -r requirements.txt
RUN npm install
RUN apt-get autoremove -y gcc

# generate the node bundles
RUN mkdir -p contentcuration/static/js/bundles #
RUN node build.js

EXPOSE 8000

ENTRYPOINT ["make", "prodserver"]
