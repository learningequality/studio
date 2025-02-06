FROM nginx:1.25

RUN rm /etc/nginx/conf.d/*      # if there's stuff here, nginx won't read sites-enabled
COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY deploy/includes /etc/nginx/includes
COPY k8s/images/nginx/entrypoint.sh /usr/bin

CMD ["entrypoint.sh"]
