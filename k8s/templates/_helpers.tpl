{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "studio.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "studio.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "cloudsql-proxy.fullname" -}}
{{- $name := .Release.Name -}}
{{- printf "%s-%s" $name "cloudsql-proxy" | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- define "redis.fullname" -}}
{{- $name := .Release.Name -}}
{{- printf "%s-%s" $name "redis" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "minio.url" -}}
{{- printf "http://%s-%s:%v" .Release.Name "minio" .Values.minio.service.port -}}
{{- end -}}


{{/*
Return the appropriate apiVersion for networkpolicy.
*/}}
{{- define "studio.networkPolicy.apiVersion" -}}
{{- if semverCompare ">=1.4-0, <1.7-0" .Capabilities.KubeVersion.GitVersion -}}
"extensions/v1"
{{- else if semverCompare "^1.7-0" .Capabilities.KubeVersion.GitVersion -}}
"networking.k8s.io/v1"
{{- end -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "studio.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Generate chart secret name
*/}}
{{- define "studio.secretName" -}}
{{ default (include "studio.fullname" .) .Values.existingSecret }}
{{- end -}}

{{/*
Generate the shared environment variables between studio app and workers
*/}}
{{- define "studio.sharedEnvs" -}}
- name: DJANGO_SETTINGS_MODULE
  value: {{ .Values.settings }}
- name: DJANGO_LOG_FILE
  value: /var/log/django.log
- name: MPLBACKEND
  value: PS
- name: STUDIO_BETA_MODE
  value: "yes"
- name: RUN_MODE
  value: k8s
- name: DATA_DB_NAME
  valueFrom:
    secretKeyRef:
      key: postgres-database
      name: {{ template "studio.fullname" . }}
- name: DATA_DB_PORT
  value: "5432"
- name: DATA_DB_USER
  valueFrom:
    secretKeyRef:
      key: postgres-user
      name: {{ template "studio.fullname" . }}
- name: DATA_DB_PASS
  valueFrom:
    secretKeyRef:
      key: postgres-password
      name: {{ template "studio.fullname" . }}
- name: CELERY_TIMEZONE
  value: America/Los_Angeles
- name: CELERY_REDIS_DB
  value: "0"
- name: CELERY_BROKER_ENDPOINT
  value: {{ template "redis.fullname" . }}-master
- name: CELERY_RESULT_BACKEND_ENDPOINT
  value: {{ template "redis.fullname" . }}-master
- name: CELERY_REDIS_PASSWORD
  valueFrom:
    secretKeyRef:
      key: redis-password
      name: {{ template "studio.fullname" . }}
- name: REMAP_SIGTERM
  value: "SIGQUIT"
- name: CELERY_WORKER_SOFT_SHUTDOWN_TIMEOUT
  value: "28"
- name: AWS_S3_ENDPOINT_URL
  value: https://storage.googleapis.com
- name: RELEASE_COMMIT_SHA
  value: {{ .Values.studioApp.releaseCommit | default "" }}
- name: BRANCH_ENVIRONMENT
  value: {{ .Release.Name }}
- name: SENTRY_DSN_KEY
  valueFrom:
    secretKeyRef:
      key: sentry-dsn-key
      name: {{ template "studio.fullname" . }}
      optional: true
- name: AWS_BUCKET_NAME
  value: {{ .Values.studioApp.gcs.bucketName }}
- name: EMAIL_CREDENTIALS_POSTMARK_API_KEY
  {{ if .Values.studioApp.postmarkApiKey }}
  valueFrom:
    secretKeyRef:
      key: postmark-api-key
      name: {{ template "studio.fullname" . }}
  {{ else }}
  value: ""
  {{ end }}

{{- end -}}
