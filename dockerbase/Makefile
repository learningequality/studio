DATE = `date '+%Y-%m-%d'`

build:
	echo $(DATE)
	docker build . -t contentcuration/base:$(DATE)

push:
	docker push contentcuration/base:$(DATE)
