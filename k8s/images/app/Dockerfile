FROM python:3.10-slim-bookworm

# Set the timezone
RUN ln -fs /usr/share/zoneinfo/America/Los_Angeles /etc/localtime

ENV DEBIAN_FRONTEND noninteractive
# Default Python file.open file encoding to UTF-8 instead of ASCII, workaround for le-utils setup.py issue
ENV LANG C.UTF-8
RUN apt-get update && apt-get -y install python3-pip python3-dev gcc libpq-dev libssl-dev libffi-dev make git curl libjpeg-dev ffmpeg

# Pin, Download and install node 18.x
RUN apt-get update \
    && apt-get install -y ca-certificates curl gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_18.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && echo "Package: nodejs" >> /etc/apt/preferences.d/preferences \
    && echo "Pin: origin deb.nodesource.com" >> /etc/apt/preferences.d/preferences \
    && echo "Pin-Priority: 1001" >> /etc/apt/preferences.d/preferences\
    && apt-get update \
    && apt-get install -y nodejs

RUN corepack enable pnpm

COPY ./package.json .
COPY ./pnpm-lock.yaml .
RUN pnpm install

COPY requirements.txt .

RUN pip install --upgrade pip
RUN pip install --ignore-installed -r requirements.txt

COPY  . /contentcuration/
WORKDIR /contentcuration

# generate the node bundles
RUN mkdir -p contentcuration/static/js/bundles
RUN ln -s /node_modules /contentcuration/node_modules
RUN pnpm run build

ARG COMMIT_SHA
ENV RELEASE_COMMIT_SHA=$COMMIT_SHA

EXPOSE 8000

ENTRYPOINT ["make", "altprodserver"]
