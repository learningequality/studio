# WARNING: DO NOT USE THIS FILE; IT HAS BEEN SUPERSEDED BY AN ANSIBLE-BASED APPROACH:
# https://github.com/fle-internal/deployscripts/blob/master/contentworkshop/playbook.yml

CONTAINER_NAME := "contentworkshop-app-nginx-proxy"
CONTAINER_VERSION := v4
GCLOUD_PROJECT := contentworkshop-159920
GIT_PROJECT_ROOT := `git rev-parse --show-toplevel`

all: appcodeupdate imagebuild imagepush

imagebuild:
	docker build -t learningequality/$(CONTAINER_NAME):$(CONTAINER_VERSION) -f ./Dockerfile $(GIT_PROJECT_ROOT)
