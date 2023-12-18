FROM byrnedo/alpine-curl

# download all extra deps we need for the production container
# templating executable
COPY /k8s/images/nginx/download_sigil.sh /tmp/download_sigil.sh
RUN chmod +x /tmp/download_sigil.sh
RUN /tmp/download_sigil.sh

FROM nginx:1.25

RUN rm /etc/nginx/conf.d/*      # if there's stuff here, nginx won't read sites-enabled
ADD deploy/nginx.conf.jinja2 /etc/nginx/nginx.conf.jinja2
ADD k8s/images/nginx/entrypoint.sh /usr/bin

# install the templating binary
COPY --from=0 /tmp/sigil /usr/bin/

CMD entrypoint.sh
