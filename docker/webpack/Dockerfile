# learningequality/studio-webpack:base
FROM node:10-buster

RUN apt-get update --fix-missing && \
    apt-get -y install gcc git gettext libjpeg-dev && \
    apt-get -y autoremove && \
    apt-get clean

# Sources ######################################################################
RUN mkdir -p /app/contentcuration/static /src/contentcuration/contentcuration/frontend
WORKDIR /src
################################################################################

# Node packages ################################################################
COPY package.json yarn.lock /src/
RUN yarn install \
    --no-default-rc \
    --non-interactive \
    --network-timeout 1000000 \
    --pure-lockfile \
    --link-duplicates
################################################################################

# Other files ##################################################################
COPY babel.config.js postcss.config.js webpack.config.js /src/
################################################################################
