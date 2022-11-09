FROM python:3.9-slim-buster

# Set the timezone
RUN ln -fs /usr/share/zoneinfo/America/Los_Angeles /etc/localtime

ENV DEBIAN_FRONTEND noninteractive
# Default Python file.open file encoding to UTF-8 instead of ASCII, workaround for le-utils setup.py issue
ENV LANG C.UTF-8
RUN apt-get update && apt-get -y install python3-pip python3-dev gcc libpq-dev make git curl libjpeg-dev ffmpeg

# install node
RUN curl -sL https://deb.nodesource.com/setup_16.x | bash - && apt-get install -y nodejs

RUN npm install --location=global yarn && npm cache clean --force

COPY ./package.json .
COPY ./yarn.lock .
RUN yarn install && yarn cache clean

COPY requirements.txt .

RUN pip install --upgrade pip
RUN pip install --ignore-installed -r requirements.txt

COPY  . /contentcuration/
WORKDIR /contentcuration

# generate the node bundles
RUN mkdir -p contentcuration/static/js/bundles
RUN ln -s /node_modules /contentcuration/node_modules
RUN yarn run build

EXPOSE 8000

ENTRYPOINT ["make", "altprodserver"]
