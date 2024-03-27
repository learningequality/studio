FROM ubuntu:bionic

RUN apt-get update && apt-get install -y curl python-pip unzip

RUN pip install requests>=2.20.0 && pip install psycopg2-binary==2.7.4 && pip install le-utils>=0.1.19

COPY ./deploy/cloudprober.cfg /deploy/
COPY ./deploy/prober-entrypoint.sh /deploy/
COPY ./deploy/probers /deploy/probers/
