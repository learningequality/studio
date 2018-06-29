local k = import 'k.libsonnet';
local studio = import 'internal/studio.libsonnet';
local params = std.extVar("__ksonnet/params").components["ingress"];
local studioParams = std.extVar("__ksonnet/params").components["studio-app"];

local defaultBackend = studio.parts.backend(
    serviceName=studioParams.name,
    servicePort=80,
);

k.core.v1.list.new([
  studio.parts.ingress("default", params.name, defaultBackend),
])
