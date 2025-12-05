FROM nginx:1.25

# Build from inside the directory by overriding this.
ARG SRC_DIR=k8s/images/nginx

RUN rm /etc/nginx/conf.d/*      # if there's stuff here, nginx won't read sites-enabled
COPY ${SRC_DIR}/nginx.conf /etc/nginx/nginx.conf
COPY ${SRC_DIR}/includes /etc/nginx/includes
COPY ${SRC_DIR}/entrypoint.sh /usr/bin

# Really seems like it _should_ be here, as it's referenced by `nginx.conf`.
# But it's hasn't been for years.
# COPY ${SRC_DIR}/mime.types /etc/nginx/mime.types

CMD ["entrypoint.sh"]
