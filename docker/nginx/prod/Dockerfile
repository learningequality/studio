# learningequality/studio-nginx:prod
FROM learningequality/studio-webpack:prod AS static
FROM learningequality/studio-nginx:base

COPY ./templates /etc/nginx/templates/
COPY --from=static /app/contentcuration/static /app/contentcuration/static/
