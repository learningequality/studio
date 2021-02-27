# learningequality/studio-app:base
FROM python:3.6-buster

# Set the timezone
ENV DEBIAN_FRONTEND noninteractive
# Default Python file.open file encoding to UTF-8 instead of ASCII,
# workaround for le-utils setup.py issue
ENV LANG C.UTF-8
ENV PATH /usr/local/bin:$PATH
RUN ln -fs /usr/share/zoneinfo/America/Los_Angeles /etc/localtime

# System packages ##############################################################
RUN apt-get update --fix-missing && \
    apt-get -y install \
        curl git man make \
        gcc libpq-dev make git gettext libjpeg-dev && \
    apt-get -y autoremove && \
    apt-get clean

# Sources ######################################################################
WORKDIR /src
RUN mkdir -p /src/contentcuration
COPY Makefile requirements.txt /src/
################################################################################

# Python packages ##############################################################
RUN pip install \
    --isolated \
    --no-cache-dir \
    --ignore-installed \
    -r requirements.txt
################################################################################
