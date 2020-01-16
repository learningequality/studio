Vagrant.configure("2") do |config|
  private_ip = {
    "minio" => "10.0.11.10",
    "postgres" => "10.0.11.11",
    "redis" => "10.0.11.12"
  }

  config.vm.define "minio" do |minio|
    env = {
      "MINIO_ACCESS_KEY" => "development",
      "MINIO_SECRET_KEY" => "development"
    }
    minio.vm.synced_folder ".", "/vagrant", disabled: true
    minio.vm.network "forwarded_port", guest: 9000, host: 9000
    minio.vm.network "private_network", ip: private_ip["minio"]

    minio.vm.provider "docker" do |docker, override|
      docker.image = "minio/minio"
      docker.cmd = ["minio", "server", "/data"]
      docker.env = env
      docker.create_args = ["-v", "minio_data:/data"]
    end

    minio.vm.provider "virtualbox" do |virtualbox, override|
      override.vm.box = "elegoev/ubuntu-18.04-minio"
      virtualbox.memory = 1024
      virtualbox.cpus = 2

      override.vm.provision "shell" do |s|
        s.path = "./vagrant/provision_minio.sh"
        s.args = env.keys
        s.env = env
      end
    end
  end

  config.vm.define "postgres" do |postgres|
    env = {
      "PGDATA" => "/var/lib/postgresql/data/pgdata",
      "POSTGRES_USER" => "learningequality",
      "POSTGRES_PASSWORD" => "kolibri",
      "POSTGRES_DB" => "kolibri-studio",
    }
    postgres.vm.synced_folder ".", "/vagrant", disabled: true
    postgres.vm.network "forwarded_port", guest: 5432, host: 5432
    postgres.vm.network "private_network", ip: private_ip["postgres"]

    postgres.vm.provider "docker" do |docker, override|
      docker.image = "postgres:9.6"
      docker.env = env
      docker.create_args = ["-v", "pgdata:/var/lib/postgresql/data/pgdata"]
    end

    postgres.vm.provider "virtualbox" do |virtualbox, override|
      override.vm.box = "ubuntu/bionic64"
      virtualbox.memory = 1024
      virtualbox.cpus = 2

      override.vm.provision "provision_postgres", type: "shell" do |s|
        s.path = "./vagrant/provision_postgres.sh"
        s.env = env
      end
    end
  end

  config.vm.define "redis" do |redis|
    redis.vm.synced_folder ".", "/vagrant", disabled: true
    redis.vm.network "forwarded_port", guest: 6379, host: 6379
    redis.vm.network "private_network", ip: private_ip["redis"]

    redis.vm.provider "docker" do |docker, override|
      docker.image = "redis:4.0.9"
    end

    redis.vm.provider "virtualbox" do |virtualbox, override|
      override.vm.box = "ubuntu/bionic64"
      virtualbox.memory = 1024
      virtualbox.cpus = 2

      override.vm.provision "shell" do |s|
        s.path = "./vagrant/provision_redis.sh"
      end
    end
  end
end
