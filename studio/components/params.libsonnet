{
  global: {
    // User-defined global parameters; accessible to all component and environments, Ex:
    // replicas: 4,
  },
  components: {
    // Component-level parameters, defined initially from 'ks prototype use ...'
    // Each object below should correspond to a component in the components/ directory
    "studio-app": {
      appPort: 8081,
      image: "d72e21049c7b480f5a74c745d8164d49a15b2dd7",
      name: "studio-app",
      nginxImage: "v4",
      replicas: 1,
      type: "ClusterIP",
    },
    "studio-redis": {
      name: "studio-redis",
      redisPassword: "adsiofjeklnarladsf",
    },
    "studio-postgres": {
      name: "studio-postgres",
      namespace: "default",
      password: "notsecure",
      database: "content-curation",
      user: "www-data",
    },
  },
}
