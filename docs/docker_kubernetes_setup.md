# Docker + Kubernetes Studio Instance Setup

One of Kolibri Studio's deployment methods use Kubernetes and Docker. If you woud like to get Studio up and running with minimal configuration, this is the method you want to use. This works best on a Linux or MacOS machine.


## Running Docker

You need to install the latest [Docker edition](https://hub.docker.com/search/?type=edition&offering=community). Make sure it comes with the `docker-compose` executable.

To set up your environment, run

    docker-compose up

This will download all service images needed, and build the dev environment for Studio under another image. Once all images are pulled, built and containers started from them, visit `localhost:8080` in your browser, and you should see the Studio interface!


## Prerequisites

Download the following applications on to your local machine, in order:

- [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/), the program
to control Kubernetes clusters.

- [Docker](https://docs.docker.com/install/), the containerization platform LE uses.

- [Helm](https://www.helm.sh/), an abstracting application on top
  of kubectl to make deployments easier.

- [Minikube](https://github.com/kubernetes/minikube#installation), an
application to get a local Kubernetes cluster up and running.

- [Virtualbox](https://www.virtualbox.org), the Virtual Machine runner that Minikube
will use to run Kubernetes.



## Deploying on Minikube

Follow each of these steps in your terminal to get a local Studio deployment
in a cluster on your local machine:

  1. Clone the Studio repo to your local machine:


  ```bash
  $ git clone https://github.com/learningequality/studio
  $ cd studio/
  ```

  1. Go to the `k8s/` directory in the Kolibri studio repo:

  ```bash
  $ cd k8s/
  ```

  1. Get your local Kubernetes cluster up and running using Minikube:

  ```bash
  $ minikube start --kubernetes-version v1.8.0
  ```

  This should start the Kubernetes cluster, and set up kubectl to
  refer to the minikube cluster.

  1. Point the docker command to the docker daemon running in Minikube:

  ```bash
  $ eval $(minikube docker-env)
  ```

  1. Build the docker images:

  ```bash
  $ make build
  ```

  1. Initialize your Kubernetes cluster with Helm, to allow it to deploy Kubernetes manifests:

  ```
  $ helm init
  ```

  1. Use the images to deploy Kolibri Studio:

  ```
  $ helm upgrade --install mystudio .
  ```

  1. Once Studio is ready to use (it should take about a minute), run this command:

  ```
  $ minikube service mystudio-studio-app --url
  ```

  and open the IP address displayed, in to your browser. You should now see the Studio login page!
