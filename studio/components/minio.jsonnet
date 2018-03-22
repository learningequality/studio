local env = std.extVar("__ksonnet/environments");
local params = std.extVar("__ksonnet/params").components.minio;
local k = import "k.libsonnet";
local deployment = k.apps.v1beta1.deployment;
local secret = k.core.v1.secret;
local persistentVolumeClaim = k.core.v1.persistentVolumeClaim;
local container = k.apps.v1beta1.deployment.mixin.spec.template.spec.containersType;
local containerPort = container.portsType;
local service = k.core.v1.service;
local servicePort = k.core.v1.service.mixin.spec.portsType;

local targetPort = params.containerPort;
local labels = {app: params.name};

# create secret for access keys

local secretData = {
  minio_access_key: std.base64("development"),
  minio_secret_key: std.base64("development"),
};

local appSecret = secret.new(name="minio-creds", data=secretData);

# create persistent volume

local volumeClaimRef = {
  name: "minio-pvc"
};

local volumeClaim =
  persistentVolumeClaim.new()
+ persistentVolumeClaim.mixin.metadata.withName(volumeClaimRef.name)
+ persistentVolumeClaim.mixin.spec.withAccessModes("ReadWriteOnce")
+ persistentVolumeClaim.mixin.spec.resources.withRequests({storage: params.size});

local volumeClaimMount = {
  name: volumeClaimRef.name,
  mountPath: "/data"
};

# connect to studio

local appService = service
  .new(
    params.name,
    labels,
    servicePort.new(params.servicePort, targetPort))
  .withType(params.type);

local appDeployment = deployment
  .new(
    params.name,
    params.replicas,
    container
      .new(params.name, params.image)
      .withPorts(containerPort.new(targetPort))
      .withEnvMixin([
        container.envType.fromSecretRef("MINIO_ACCESS_KEY", appSecret.metadata.name, "minio_access_key"),
        container.envType.fromSecretRef("MINIO_SECRET_KEY", appSecret.metadata.name, "minio_secret_key"),
      ])


      // run on /data
      .withCommand(["minio", "server", volumeClaimMount.mountPath]),
      labels)

  # mount our persistent storage
  .withVolumesMixin({
    name: volumeClaimRef.name,
    persistentVolumeClaim: {
      claimName: volumeClaimRef.name
    }
  })
  + deployment.mapContainers(function(c) c.withVolumeMounts(volumeClaimMount));

k.core.v1.list.new([appSecret, appService, appDeployment, volumeClaim])
