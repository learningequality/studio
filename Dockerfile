FROM contentcuration/base:2017-08-01

COPY  . /contentcuration/
WORKDIR /contentcuration

# Generate the gcloud debugger context file
RUN gcloud debug source gen-repo-info-file --output-directory=/contentcuration/contentcuration/

RUN pip install -r requirements.txt
RUN pip install -r requirements_prod.txt
RUN npm install -g yarn

# generate the node bundles
RUN mkdir -p contentcuration/static/js/bundles #
RUN yarn install
RUN node build.js

# Download the crowdin-cli.jar file
RUN curl -L https://storage.googleapis.com/le-downloads/crowdin-cli/crowdin-cli.jar -o crowdin-cli.jar

EXPOSE 8000

ENTRYPOINT ["make", "prodserver"]
