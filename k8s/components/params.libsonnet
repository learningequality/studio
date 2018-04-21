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
      image: "gcr.io/github-learningequality-studio/app:nlatest",
      name: "studio-app",
      workerName: "studio-workers",
      nginxImage: "learningequality/contentworkshop-app-nginx-proxy:v4",
      replicas: 1,
      workerReplicas: 1,
      settings: "contentcuration.settings",
      log_file: "/var/log/django.log",
      type: "NodePort",
      djangoSecretKey: "",
    },
    "ingress": {
      host: "studio.learningequality.org",
      name: "studio-ingress",
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
    "objectstorage": {
      containerPort: 9000,
      image: "minio/minio",
      name: "minio",
      replicas: 1,
      servicePort: 80,
      type: "ClusterIP",
      size: "5Gi",
      minio_access_key: "development",
      minio_secret_key: "development",
    },
  },
}
