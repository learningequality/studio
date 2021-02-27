# learningequality/studio-nginx:base
FROM nginx:1.19

ENV AWS_S3_BUCKET_NAME=""

RUN mkdir -p /etc/nginx/templates /app/contentcuration/static

COPY nginx.conf /etc/nginx/
COPY ./templates/* /etc/nginx/templates/
