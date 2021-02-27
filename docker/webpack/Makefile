IMAGE_TAG_BASE = learningequality/studio-webpack

.PHONY: build-base build-dev build-prod clean

build/.eslintrc.js: ../../.eslintrc.js
build/.htmlhintrc.js: ../../.htmlhintrc.js
build/.huskyrc: ../../.huskyrc
build/.prettierrc.js: ../../.prettierrc.js
build/babel.config.js: ../../babel.config.js
build/postcss.config.js: ../../postcss.config.js
build/package.json: ../../package.json
build/yarn.lock: ../../yarn.lock
build/webpack.config.js: ../../webpack.config.js
build/%:
	@mkdir -p build
	@cp $< $@

build-base: | clean build/babel.config.js build/postcss.config.js build/package.json build/yarn.lock build/webpack.config.js
	@docker build -t $(IMAGE_TAG_BASE):base -f Dockerfile ./build

build-dev: | build-base build/.eslintrc.js build/.htmlhintrc.js build/.huskyrc build/.prettierrc.js
	@docker build -t $(IMAGE_TAG_BASE):dev -f dev/Dockerfile ./build

build-prod: | build-base
	@docker build -t $(IMAGE_TAG_BASE):prod -f prod/Dockerfile ../../contentcuration

clean:
	@rm -rf ./build
