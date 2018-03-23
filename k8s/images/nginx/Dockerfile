FROM nginx:1.11

RUN rm /etc/nginx/conf.d/*      # if there's stuff here, nginx won't read sites-enabled
ADD deploy/nginx.conf /etc/nginx/nginx.conf
CMD nginx -c /etc/nginx/nginx.conf