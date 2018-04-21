local env = std.extVar("__ksonnet/environments");
local params = std.extVar("__ksonnet/params").components["studio-app"];
local postgres = std.extVar("__ksonnet/params").components["studio-postgres"];
local studioRedis = std.extVar("__ksonnet/params").components["studio-redis"];
local minioParams = std.extVar("__ksonnet/params").components["objectstorage"];
local k = import "k.libsonnet";
local deployment = k.apps.v1beta1.deployment;
local container = k.apps.v1beta1.deployment.mixin.spec.template.spec.containersType;
local envVar = container.envType;
local volume = k.apps.v1beta1.deployment.mixin.spec.template.spec.volumesType;
local containerPort = container.portsType;
local secret = k.core.v1.secret;
local service = k.core.v1.service;
local servicePort = k.core.v1.service.mixin.spec.portsType;

local targetPort = params.containerPort;
local labels = {app: params.name};
local workerLabels = {app: params.workerName};

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

local djangoSecretDataName = "django-secret-key";

local djangoSecretData = {
  secret_key: std.base64(params.djangoSecretKey)
};

local djangoSecretKey = secret.new(name=djangoSecretDataName, data=djangoSecretData);


## Variables shared across both workers and app

# django config vars
local django_config_vars = [
  envVar.new("DJANGO_SETTINGS_MODULE", params.settings),
  envVar.new("DJANGO_LOG_FILE", params.log_file),
  envVar.new("MPLBACKEND", "PS"),  # so that matplotlib will only run one consistent backend
] + if params.djangoSecretKey != "" then [envVar.fromSecretRef("DJANGO_SECRET_KEY", djangoSecretDataName, "secret_key")] else [];

# DB vars
local db_vars = [
  envVar.new("DATA_DB_HOST", postgres.name),
  envVar.new("DATA_DB_NAME", postgres.database),
  envVar.new("DATA_DB_PORT", "5432"),
  envVar.new("DATA_DB_USER", postgres.user),
  envVar.fromSecretRef("DATA_DB_PASS", postgres.name, "postgres-password"),
];

# celery vars
local celery_vars = [
  envVar.new("CELERY_TIMEZONE", "America/Los_Angeles"),
  envVar.new("CELERY_REDIS_DB", "0"),
  envVar.new("CELERY_BROKER_ENDPOINT", studioRedis.name),
  envVar.new("CELERY_RESULT_BACKEND_ENDPOINT", studioRedis.name),
  envVar.fromSecretRef("CELERY_REDIS_PASSWORD", studioRedis.name, "redis-password"),
];

# object storage vars
local object_storage_vars = if minioParams.external == false then
[
  envVar.fromSecretRef("AWS_ACCESS_KEY_ID", minioParams.name, "minio_access_key"),
  envVar.fromSecretRef("AWS_SECRET_ACCESS_KEY", minioParams.name, "minio_secret_key"),
  envVar.new("AWS_S3_ENDPOINT_URL", "http://" + minioParams.name)
]
else
[
  envVar.fromSecretRef("AWS_ACCESS_KEY_ID", minioParams.name, "minio_access_key"),
  envVar.fromSecretRef("AWS_SECRET_ACCESS_KEY", minioParams.name, "minio_secret_key"),
  envVar.new("AWS_S3_ENDPOINT_URL", minioParams.external.url),
  envVar.new("AWS_BUCKET_NAME", minioParams.external.bucket),
];

local livenessProbe = {
  livenessProbe: {
    httpGet: {
      path: "/healthz",
      port: params.appPort,
    },
    initialDelaySeconds: 300, # 5 minutes before the first health check
    periodSeconds: 10,
  },
};

local readinessProbe = {
  readinessProbe: {
    httpGet: {
      path: "/",
      port: 8080,
    },
    initialDelaySeconds: 10,
    periodSeconds: 10,
  }
};

local appDeployment = deployment
  .new(
    params.name,
    params.replicas,
    container
      .new("app", params.image)
      .withPorts(containerPort.new(params.appPort))
      .withEnv(
        # env vars unique to the app servers
        envVar.new("STATICFILES_DIR", staticfilesVolumeMount.mountPath),
      )
      .withEnvMixin(django_config_vars)
      .withEnvMixin(db_vars)
      .withEnvMixin(celery_vars)
      .withEnvMixin(object_storage_vars)
      + livenessProbe
      + readinessProbe,
      labels)
  # add our nginx proxy
  .withContainersMixin(
      container.new("nginx-proxy", params.nginxImage)
      .withPorts(containerPort.new(podListeningPort))
  )

  # add our staticfiles volume mount
  .withVolumes(staticfilesVolume)
  + deployment.mapContainers(function(c) c.withVolumeMounts(staticfilesVolumeMount));

local workersDeployment = deployment.new(
    params.workerName,
    params.workerReplicas,
    container
    .new(params.name, params.image)
    .withEnvMixin(django_config_vars)
    .withEnvMixin(db_vars)
    .withEnvMixin(celery_vars)
    .withEnvMixin(object_storage_vars)
    .withCommand(["make", "prodceleryworkers"]),
    workerLabels);

k.core.v1.list.new([appService, appDeployment, workersDeployment]
    # Create secret key secret if we fill it out
    + if params.djangoSecretKey != "" then [djangoSecretKey] else [])
