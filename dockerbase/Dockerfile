FROM ubuntu:xenial

RUN apt-get update

RUN apt-get -y install curl
RUN curl -sL https://deb.nodesource.com/setup_4.x | bash -
RUN apt-get update
RUN apt-get -y install nodejs python python-dev python-pip gcc libpq-dev ffmpeg imagemagick ghostscript python-tk make git gettext openjdk-9-jre-headless

# Install the google cloud sdk

# Add the Cloud SDK distribution URI as a package source
RUN echo "deb https://packages.cloud.google.com/apt cloud-sdk-trusty main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list

# Import the Google Cloud Platform public key
RUN curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add -

# Update the package list and install the Cloud SDK
RUN apt-get update && apt-get -y install google-cloud-sdk
