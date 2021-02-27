# learningequality/studio-prober:base
FROM python:3.6-buster

RUN apt-get update && apt-get install -y curl unzip

RUN pip install requests>=2.20.0 && pip install psycopg2-binary==2.7.4 && pip install le-utils>=0.1.19

COPY ./cloudprober.cfg /deploy/
COPY ./send_metrics_newrelic.py /deploy/
COPY ./prober-entrypoint.sh /deploy/
COPY ./probers /deploy/probers/
