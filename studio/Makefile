deploy:
	make -C images/app/ imagebuild
	make -C images/nginx/ imagebuild

setup:
	minikube addons enable freshpod
