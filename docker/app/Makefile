IMAGE_TAG_BASE = learningequality/studio-app

.PHONY: build-base build-dev build-prod clean

build/entrypoint.py: dev/entrypoint.py
build/flake.lock: ../../flake.lock
build/flake.nix: ../../flake.nix
build/pytest.ini: ../../pytest.ini
build/requirements.txt: ../../requirements.txt
build/requirements-dev.txt: ../../requirements-dev.txt
build/Makefile: ../../Makefile
build/setup.cfg: ../../setup.cfg
build/%:
	@mkdir -p build
	@cp $< $@

build-base: | clean build/Makefile build/requirements.txt
	@docker build -t $(IMAGE_TAG_BASE):base -f Dockerfile ./build

build-dev: | build-base build/entrypoint.py build/flake.lock build/flake.nix build/pytest.ini build/requirements-dev.txt build/setup.cfg
	@docker build -t $(IMAGE_TAG_BASE):dev -f dev/Dockerfile ./build

build-prod: | build-base
	@docker build -t $(IMAGE_TAG_BASE):prod -f prod/Dockerfile ../../contentcuration

clean:
	@rm -rf ./build
