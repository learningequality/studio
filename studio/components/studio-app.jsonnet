local env = std.extVar("__ksonnet/environments");
local params = std.extVar("__ksonnet/params").components["studio-app"];
local postgres = std.extVar("__ksonnet/params").components["studio-postgres"];
local k = import "k.libsonnet";
local deployment = k.apps.v1beta1.deployment;
local container = k.apps.v1beta1.deployment.mixin.spec.template.spec.containersType;
local containerPort = container.portsType;
local service = k.core.v1.service;
local servicePort = k.core.v1.service.mixin.spec.portsType;

local targetPort = params.containerPort;
local labels = {app: params.name};

local serviceListeningPort = 80;
local podListeningPort = 80;

local appService = service
  .new(
    params.name,
    labels,
    servicePort.new(serviceListeningPort, podListeningPort)
  )
  .withType(params.type);

local appDeployment = deployment
  .new(
    params.name,
    params.replicas,
    container
      .new(params.name, params.image)
      .withPorts(containerPort.new(params.appPort))
      # add our secret variables
      .withEnvMixin([
        container.envType.new("DB_CREDENTIALS_HOST", postgres.name),
        container.envType.new("DB_CREDENTIALS_DB_NAME", postgres.database),
        container.envType.new("DB_CREDENTIALS_PORT", "5432"),
        container.envType.new("DB_CREDENTIALS_USER", postgres.user),
        container.envType.fromSecretRef("DB_CREDENTIALS_PASSWORD", postgres.name, "postgres-password"),
      ]),
      labels)
  # add our nginx proxy
  .withContainersMixin(
      container.new("nginx-proxy", "learningequality/contentworkshop-app-nginx-proxy:v1")
      .withPorts(containerPort.new(podListeningPort))
  );

k.core.v1.list.new([appService, appDeployment])
