{
  global: {
    // User-defined global parameters; accessible to all component and environments, Ex:
    // replicas: 4,
  },
  components: {
    // Component-level parameters, defined initially from 'ks prototype use ...'
    // Each object below should correspond to a component in the components/ directory
    "studio-app": {
      image: "gcr.io/github-learningequality-studio/app:417269950bf748aceab1945e80d625716611f8271",
      name: "studio-app",
      replicas: 1,
      appPort: 8080,
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
