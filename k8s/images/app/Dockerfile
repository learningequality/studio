FROM contentcuration/base:2018-04-20

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
RUN node build.js --prod --prefix=/

# Download the crowdin-cli.jar file
# RUN curl -L https://storage.googleapis.com/le-downloads/crowdin-cli/crowdin-cli.jar -o crowdin-cli.jar

EXPOSE 8000

ENTRYPOINT ["make", "altprodserver"]
