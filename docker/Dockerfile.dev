FROM ubuntu:xenial

# Studio source directory ######################################################
RUN mkdir /src
WORKDIR /src
################################################################################


# System packages ##############################################################

RUN apt-get update --fix-missing && apt-get -y install \
    curl fish man \
    python python-dev python-pip \
    gcc libpq-dev ffmpeg imagemagick unzip \
    ghostscript python-tk make git gettext openjdk-9-jre-headless libjpeg-dev \
    wkhtmltopdf fonts-freefont-ttf xfonts-75dpi poppler-utils

# Download and install wkhtmltox
RUN curl -L -o wkhtmltox.deb https://github.com/wkhtmltopdf/wkhtmltopdf/releases/download/0.12.5/wkhtmltox_0.12.5-1.xenial_amd64.deb && dpkg -i wkhtmltox.deb

# Download then install node
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash - &&\
    apt-get install -y nodejs
################################################################################


# Node packages ################################################################
RUN npm install -g yarn
COPY ./package.json ./yarn.lock   /src/
RUN  yarn install --network-timeout 1000000 --pure-lockfile
ENV PATH="/src/node_modules/.bin:$PATH"
################################################################################


# Python packages ##############################################################
COPY Pipfile Pipfile.lock   /src/
RUN pip install --upgrade pip
RUN pip install -U pipenv
# install packages from Pipfile.lock into system
RUN pipenv install --dev --system --ignore-pipfile
################################################################################


# Cloudprober binary ###########################################################
RUN curl -L -o /cloudprober.zip https://github.com/google/cloudprober/releases/download/v0.10.2/cloudprober-v0.10.2-linux-x86_64.zip
RUN unzip -p /cloudprober.zip > /bin/cloudprober
RUN chmod +x /bin/cloudprober
################################################################################


CMD ["yarn", "run", "devserver"]
