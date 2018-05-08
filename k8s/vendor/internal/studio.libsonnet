local k = import 'k.libsonnet';

{
  parts:: {
    ingress(namespace, name, defaultBackend=null, hostsArray=null, labels={app:name})::
      local defaults = {};

    {
      apiVersion: "extensions/v1beta1",
      kind: "Ingress",
      metadata: {
        name: name,
        namespace: namespace,
        labels: labels,
      },
      spec: {
        [if defaultBackend != null then "backend"]: defaultBackend,
        [if hostsArray != null then "rules"]: hostsArray,
      }
    },

    backend(serviceName, servicePort)::

    {
      serviceName: serviceName,
      servicePort: servicePort,
    },

    host(hostname, pathsDict)::

    local paths = [{path: key, backend: pathsDict[key]} for key in std.objectFields(pathsDict)];

    {
      host: hostname,
      http: {
        paths: paths
      }
    }
  }
}
