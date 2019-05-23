FROM ubuntu:xenial

RUN apt-get update --fix-missing

RUN apt-get -y install curl

# Add the Cloud SDK distribution URI as a package source
RUN echo "deb http://packages.cloud.google.com/apt cloud-sdk-xenial main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list

# Import the Google Cloud Platform public key
RUN curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add -

# install node
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash -

RUN apt-get -y install nodejs python python-dev python-pip gcc libpq-dev ffmpeg imagemagick ghostscript python-tk make git gettext openjdk-9-jre-headless curl libjpeg-dev wkhtmltopdf google-cloud-sdk fonts-freefont-ttf xfonts-75dpi poppler-utils unzip

RUN curl -L -o wkhtmltox.deb https://github.com/wkhtmltopdf/wkhtmltopdf/releases/download/0.12.5/wkhtmltox_0.12.5-1.xenial_amd64.deb && dpkg -i wkhtmltox.deb

RUN npm install -g yarn

COPY ./package.json .
COPY ./yarn.lock .
RUN yarn install

COPY Pipfile .
COPY Pipfile.lock .

# Copy prober files
COPY deploy/cloudprober.cfg .
COPY deploy/probers ./probers/
COPY docker/prober-entrypoint.sh .

RUN pip install --upgrade pip
RUN pip install -U pipenv
# install the environment exactly as specified in the Pipfile.lock file
RUN pipenv install --system --ignore-pipfile --keep-outdated

COPY  . /contentcuration/
WORKDIR /contentcuration

# generate the node bundles
RUN mkdir -p contentcuration/static/js/bundles
RUN ln -s /node_modules /contentcuration/node_modules
RUN yarn run build -p

EXPOSE 8000

ENTRYPOINT ["make", "altprodserver"]
