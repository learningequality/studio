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
      external: false,
      # to define the external DB, override external with the following attributes:
      # external: {
      #   gcloudConnectionName: "<the DB connection name in Cloud SQL>",
      #   ServiceAccountCredentialsSecret: "<the k8s secret name containing the service account."
      #   DBCredentialsSecret: "<the k8s secret name containing the production DB credentials>"
      # }
      # Before running this, you need to create an IAM service account on GCP that has
      # the "Cloud SQL Client" role. That would generate a json file for you and
      # download it to your local machine. Create a K8s secret using this json file
      # with a data entry named "credentials" whose value is the contents of the
      # service account json file.
      # You'll then need to create another secret, whose data has the user, password and database
      # values, and pass in the secret name into DBCredentialsSecret.

      # if external is false, a local instance of postgres is defined, with ephemeral data, and the
      # following credentials (with the studio app automatically set up to connect to it):
      namespace: "default",
      password: "notsecure",
      database: "content-curation",
      user: "www-data",
    },
    "objectstorage": {
      external: false,
      access_key: "development",
      secret_key: "development",
      # to define an external S3 server, set external to the following:
      # external: {
      #   url: "<the server URL>",
      #   bucket: "<the bucket name>",
      # },
      # then define access_key and secret_key appropriately
      containerPort: 9000,
      image: "minio/minio",
      name: "minio",
      replicas: 1,
      servicePort: 80,
      type: "ClusterIP",
      size: "5Gi",
    },
  },
}
