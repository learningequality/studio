local env = std.extVar("__ksonnet/environments");
local params = std.extVar("__ksonnet/params").components["studio-postgres"];
local k = import 'k.libsonnet';
local psg = import 'incubator/postgres/postgres.libsonnet';

local appName = params.name;
local namespace = params.namespace;
local password = params.password;

local pgConfig = {
  user:: params.user,
  db:: params.database,
  initDbArgs:: ""
};

k.core.v1.list.new([
  psg.parts.deployment.nonPersistent(namespace, appName, pgConfig=pgConfig),
  # aron: commented out, because it tries to create a storage class name that's invalid.
  # psg.parts.pvc(namespace, appName),
  psg.parts.secrets(namespace, appName, password),
  psg.parts.service(namespace, appName)
])
