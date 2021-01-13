FROM ubuntu:bionic

RUN apt-get update --fix-missing && apt-get -y install curl

# Set the timezone
RUN ln -fs /usr/share/zoneinfo/America/Los_Angeles /etc/localtime

# install node
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash -

ENV DEBIAN_FRONTEND noninteractive
RUN apt-get update && apt-get -y install nodejs python python-dev python-pip gcc libpq-dev ffmpeg imagemagick ghostscript python-tk make git gettext curl libjpeg-dev wkhtmltopdf fonts-freefont-ttf xfonts-75dpi poppler-utils

# install wkhtml, and libpng12 (its dependency)
RUN curl -L -o libpng12.deb http://security.ubuntu.com/ubuntu/pool/main/libp/libpng/libpng12-0_1.2.54-1ubuntu1.1_amd64.deb && dpkg -i libpng12.deb
RUN curl -L -o wkhtmltox.deb https://github.com/wkhtmltopdf/wkhtmltopdf/releases/download/0.12.5/wkhtmltox_0.12.5-1.xenial_amd64.deb && dpkg -i wkhtmltox.deb

RUN npm install -g yarn

COPY ./package.json .
COPY ./yarn.lock .
RUN yarn install

COPY Pipfile .
COPY Pipfile.lock .

RUN pip install --upgrade pip
RUN pip install -U pipenv
# install the environment exactly as specified in the Pipfile.lock file
RUN python -m pipenv install --system --ignore-pipfile --keep-outdated

COPY  . /contentcuration/
WORKDIR /contentcuration

# generate the node bundles
RUN mkdir -p contentcuration/static/js/bundles
RUN ln -s /node_modules /contentcuration/node_modules
RUN yarn run build -p

EXPOSE 8000

ENTRYPOINT ["make", "altprodserver"]
