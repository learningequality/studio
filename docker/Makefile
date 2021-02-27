SERVICES = app nginx prober webpack
DEPLOY_ENV = dev

# `make build` will trigger `make build-*` for each service
build: | $(addprefix build-, $(SERVICES))

# nginx:prod requires webpack:prod to be built already
build-nginx: | build-webpack

# delegate to individual service Makefiles for building
build-%:
	@$(MAKE) -C $(subst build-,,$@) build-$(DEPLOY_ENV)
