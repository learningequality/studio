CONTAINER_NAME := "contentworkshop-app-nginx-proxy"
CONTAINER_VERSION := v4
GCLOUD_PROJECT := contentworkshop-159920
GIT_PROJECT_ROOT := `git rev-parse --show-toplevel`

all: appcodeupdate imagebuild imagepush

imagebuild:
	docker build -t learningequality/$(CONTAINER_NAME):$(CONTAINER_VERSION) -f ./Dockerfile $(GIT_PROJECT_ROOT)
