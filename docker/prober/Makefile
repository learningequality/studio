IMAGE_TAG_BASE = learningequality/studio-prober

.PHONY: build-base build-dev build-prod clean

build/cloudprober.cfg: ../../deploy/cloudprober.cfg
build/send_metrics_newrelic.py: ../../deploy/send_metrics_newrelic.py
build/prober-entrypoint.sh: ../../deploy/prober-entrypoint.sh
build/probers: ../../deploy/probers
build/%:
	@mkdir -p build
	@cp -R $< $@

build-base: | clean build/cloudprober.cfg build/send_metrics_newrelic.py build/prober-entrypoint.sh build/probers
	@docker build -t $(IMAGE_TAG_BASE):base -f Dockerfile ./build

build-dev: | build-base
	@docker tag $(IMAGE_TAG_BASE):base $(IMAGE_TAG_BASE):dev

build-prod: | build-base
	@docker tag $(IMAGE_TAG_BASE):base $(IMAGE_TAG_BASE):prod

clean:
	@rm -rf ./build
