FROM byrnedo/alpine-curl

# download all extra deps we need for the production container

# templating executable
RUN curl -L "https://github.com/gliderlabs/sigil/releases/download/v0.4.0/sigil_0.4.0_$(uname -sm|tr \  _).tgz" \ | tar -zxC /usr/bin

FROM nginx:1.11

RUN rm /etc/nginx/conf.d/*      # if there's stuff here, nginx won't read sites-enabled
ADD deploy/nginx.conf.jinja2 /etc/nginx/nginx.conf.jinja2
ADD k8s/images/nginx/entrypoint.sh /usr/bin

# install the templating binary
COPY --from=0 /usr/bin/sigil /usr/bin

CMD entrypoint.sh