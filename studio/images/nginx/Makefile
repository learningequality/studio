# WARNING: DO NOT USE THIS FILE; IT HAS BEEN SUPERSEDED BY AN ANSIBLE-BASED APPROACH:
# https://github.com/fle-internal/deployscripts/blob/master/contentworkshop/playbook.yml

CONTAINER_NAME := "contentworkshop-app-nginx-proxy"
CONTAINER_VERSION := v1
GCLOUD_PROJECT := contentworkshop-159920

all: appcodeupdate imagebuild imagepush

imagebuild:
	docker build -t learningequality/$(CONTAINER_NAME):$(CONTAINER_VERSION) .
