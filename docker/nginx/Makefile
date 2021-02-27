IMAGE_TAG_BASE = learningequality/studio-nginx

.PHONY: build-base build-dev build-prod clean

# Keep Docker build context small, only files the we need
build/nginx.conf: ./nginx.conf
build/templates: ./templates
build/%:
	@mkdir -p build
	@cp -r $< $@

build-base: | clean build/nginx.conf build/templates
	@docker build -t $(IMAGE_TAG_BASE):base -f Dockerfile ./build

build-dev: | build-base
	@cp ./dev/templates/* ./build/templates/
	@docker build -t $(IMAGE_TAG_BASE):dev -f dev/Dockerfile ./build

build-prod: | build-base
	@cp ./prod/templates/* ./build/templates/
	@docker build -t $(IMAGE_TAG_BASE):prod -f prod/Dockerfile ./build

clean:
	@rm -rf ./build
