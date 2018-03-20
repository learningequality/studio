local env = std.extVar("__ksonnet/environments");
local params = std.extVar("__ksonnet/params").components["studio-app"];
local postgres = std.extVar("__ksonnet/params").components["studio-postgres"];
local k = import "k.libsonnet";
local deployment = k.apps.v1beta1.deployment;
local container = k.apps.v1beta1.deployment.mixin.spec.template.spec.containersType;
local volume = k.apps.v1beta1.deployment.mixin.spec.template.spec.volumesType;
local containerPort = container.portsType;
local service = k.core.v1.service;
local servicePort = k.core.v1.service.mixin.spec.portsType;

local targetPort = params.containerPort;
local labels = {app: params.name};

local serviceListeningPort = 80;
local podListeningPort = 8080;

local appService = service
  .new(
    params.name,
    labels,
    servicePort.new(serviceListeningPort, podListeningPort)
  )
  .withType(params.type);

local staticfilesVolume = {
  name: "staticfiles",
  emptyDir: {}
};

local staticfilesVolumeMount = {
  name: "staticfiles",
  mountPath: "/app/contentworkshop_static/",
};

local appDeployment = deployment
  .new(
    params.name,
    params.replicas,
    container
      .new("app", "gcr.io/github-learningequality-studio/app:" + params.image)
      .withPorts(containerPort.new(params.appPort))
      # add our secret variables
      .withEnvMixin([
        container.envType.new("DATA_DB_HOST", postgres.name),
        container.envType.new("DATA_DB_NAME", postgres.database),
        container.envType.new("DATA_DB_PORT", "5432"),
        container.envType.new("DATA_DB_USER", postgres.user),
        container.envType.new("STATICFILES_DIR", staticfilesVolumeMount.mountPath),
        container.envType.fromSecretRef("DATA_DB_PASS", postgres.name, "postgres-password"),
      ]),
      labels)
  # add our nginx proxy
  .withContainersMixin(
      container.new("nginx-proxy", "learningequality/contentworkshop-app-nginx-proxy:" + params.nginxImage)
      .withPorts(containerPort.new(podListeningPort))
  )

  # add our staticfiles volume mount
  .withVolumes(staticfilesVolume)
  + deployment.mapContainers(function(c) c.withVolumeMounts(staticfilesVolumeMount));

k.core.v1.list.new([appService, appDeployment])
