FROM ubuntu:xenial

RUN apt-get update

RUN apt-get -y install curl

# Add the Cloud SDK distribution URI as a package source
RUN echo "deb http://packages.cloud.google.com/apt cloud-sdk-xenial main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list

# Import the Google Cloud Platform public key
RUN curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add -

# install node
RUN curl -sL https://deb.nodesource.com/setup_6.x | bash -

RUN apt-get -y install nodejs python python-dev python-pip gcc libpq-dev ffmpeg imagemagick ghostscript python-tk make git gettext openjdk-9-jre-headless curl libjpeg-dev wkhtmltopdf google-cloud-sdk

RUN npm install -g yarn

COPY ./package.json .
COPY ./yarn.lock .
RUN yarn install
ENV PATH="/node_modules/.bin:$PATH"

COPY Pipfile .
COPY Pipfile.lock .
RUN pip install -U pip pipenv
RUN pipenv install --system  # install packages from Pipfile.lock into system

COPY  . /contentcuration/
WORKDIR /contentcuration

# generate the node bundles
RUN mkdir -p contentcuration/static/js/bundles #
RUN ln -s /node_modules /contentcuration/node_modules
RUN yarn run build -p

# Download the translated strings
# Note: this only runs if CROWDIN_PROJECT and CROWDIN_API_KEY
# env vars are defined.
# Crowdin credentials that can be passed in during build time
ARG CROWDIN_PROJECT
ARG CROWDIN_API_KEY
RUN CROWDIN_PROJECT=$CROWDIN_PROJECT CROWDIN_API_KEY=$CROWDIN_API_KEY deploy/downloadmessages.py

EXPOSE 8000

ENTRYPOINT ["make", "altprodserver"]
