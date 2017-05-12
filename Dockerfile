FROM ubuntu:xenial

RUN apt-get update

RUN apt-get -y install curl
RUN curl -sL https://deb.nodesource.com/setup_4.x | bash -
RUN apt-get update
RUN apt-get -y install nodejs python python-dev python-pip gcc libpq-dev ffmpeg imagemagick ghostscript python-tk make git

# Install the google cloud sdk
# Create an environment variable for the correct distribution
ENV CLOUD_SDK_REPO="cloud-sdk-$(lsb_release -c -s)"

# Add the Cloud SDK distribution URI as a package source
RUN echo "deb https://packages.cloud.google.com/apt $CLOUD_SDK_REPO main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list

# Import the Google Cloud Platform public key
RUN curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add -

# Update the package list and install the Cloud SDK
RUN apt-get update && apt-get install google-cloud-sdk

COPY  . /contentcuration/
WORKDIR /contentcuration

# Generate the gcloud debugger context file
RUN gcloud debug source gen-repo-info-file --output-directory=/contentcuration/

RUN pip install -r requirements.txt
RUN npm install
RUN apt-get autoremove -y gcc

# generate the node bundles
RUN mkdir -p contentcuration/static/js/bundles #
RUN node build.js

EXPOSE 8000

ENTRYPOINT ["make", "prodserver"]
