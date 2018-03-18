FROM nginx:1.11

RUN rm /etc/nginx/conf.d/*      # if there's stuff here, nginx won't read sites-enabled
COPY nginx.conf /etc/nginx/nginx.conf
COPY contentworkshop.conf /etc/nginx/sites-enabled/contentworkshop.conf
