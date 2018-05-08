local env = std.extVar("__ksonnet/environments");
local params = std.extVar("__ksonnet/params").components["studio-redis"];
local k = import 'k.libsonnet';
local redis = import 'incubator/redis/redis.libsonnet';

local name = params.name;
local redisPassword = params.redisPassword;

local secretName =
  if redisPassword != "null" then name else null;

local optionalSecret =
  if redisPassword != "null"
  then redis.parts.secret(name, redisPassword)
  else null;

std.prune(k.core.v1.list.new([
  redis.parts.deployment.nonPersistent(name, secretName),
  redis.parts.svc.metricDisabled(name),
  optionalSecret,
]))
