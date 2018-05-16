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

RUN npm install -g yarn webpack


COPY ./package.json .
COPY ./yarn.lock .
RUN yarn install

COPY ./requirements.txt .
COPY ./requirements_prod.txt .
RUN pip install -r requirements.txt
RUN pip install -r requirements_prod.txt

COPY  . /contentcuration/
WORKDIR /contentcuration

# generate the node bundles
RUN mkdir -p contentcuration/static/js/bundles #
RUN yarn run build -p

# Download the crowdin-cli.jar file
# RUN curl -L https://storage.googleapis.com/le-downloads/crowdin-cli/crowdin-cli.jar -o crowdin-cli.jar

EXPOSE 8000

ENTRYPOINT ["make", "altprodserver"]
