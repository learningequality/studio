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

