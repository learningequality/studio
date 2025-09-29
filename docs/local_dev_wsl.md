# Kolibri Studio Local Setup Guide Using WSL

This guide will walk you through setting up Kolibri Studio for local development using Windows Subsystem for Linux (WSL). We will cover everything from installing WSL and a Linux distribution to configuring your environment and running the necessary commands.

## Table of Contents

 1. [Install WSL and Ubuntu](#install-wsl-and-ubuntu)
 2. [Update and Upgrade Packages](#update-and-upgrade-packages)
 3. [Install Prerequisites](#install-prerequisites)
 4. [Install System Dependencies and Services](#install-system-dependencies-and-services)
 5. [Set Up the Database](#set-up-the-database)
 6. [Configure .bashrc](#configure-bashrc)
 7. [Set Up Python Virtual Environment](#set-up-python-virtual-environment)
 8. [Install Frontend Dependencies](#install-frontend-dependencies)
 9. [Run the Services](#run-the-services)
10. [Initialize Studio](#initialize-studio)
11. [Run the Development Server](#run-the-development-server)
12. [Access Kolibri Studio](#access-kolibri-studio)

## Install WSL and Ubuntu

1. **Enable WSL**: Open PowerShell as Administrator and run the following command to enable WSL:

   ```sh
   wsl --install
   ```

   This command will install WSL and the default Linux distribution (Ubuntu). If you need to install a specific version of Ubuntu, you can follow the instructions on the [official WSL installation guide](https://docs.microsoft.com/en-us/windows/wsl/install).

2. **Set Up Your Linux Username and Password**: After the installation is complete, you will be prompted to set up your Linux username and password.

3. **Set WSL Version to 2**:

   ```sh
   wsl --set-default-version 2
   ```

## Update and Upgrade Packages

Open your WSL terminal and update the package lists:

```sh
sudo apt update
sudo apt upgrade -y
```

Fork the repo and clone it by running the following command:

```sh
git clone https://github.com/$USERNAME/studio.git
```

Replace `$USERNAME` with your GitHub username.

## Install Prerequisites
For detailed instructions on installing and configuring Volta, pyenv, and pyenv-virtualenv, please see the [Prerequisites](./local_dev_host.md#prerequisites) section in our Local Development with host guide.

## Install System Dependencies and Services

Studio requires some background services to be running:

* Minio - a local S3 storage emulation
* PostgreSQL - a relational database
* Redis - a fast key/value store useful for caching

Install the necessary system dependencies and services:

```sh
sudo apt-get update
sudo apt-get install -y python-tk postgresql-server-dev-all postgresql-contrib postgresql-client postgresql-12 ffmpeg libmagickwand-dev redis-server wkhtmltopdf
```

### Install MinIO

Download and install MinIO:

```sh
wget https://dl.minio.io/server/minio/release/linux-amd64/minio -O bin/minio
sudo chmod +x ~/bin/minio
```

## Set Up the Database

### Start PostgreSQL Service

Make sure PostgreSQL is running:

```sh
sudo service postgresql start
```

### Create Database and User

Start the client with:

```sh
sudo su postgres
psql
```

Run the following SQL commands:

```sql
CREATE USER learningequality WITH NOSUPERUSER INHERIT NOCREATEROLE CREATEDB LOGIN NOREPLICATION NOBYPASSRLS PASSWORD 'kolibri';
CREATE DATABASE "kolibri-studio" WITH TEMPLATE = template0 ENCODING = "UTF8" OWNER = "learningequality";
```

Exit the PostgreSQL client:

```sh
\q
exit
```

## Set Up Python Virtual Environment
For complete instructions on installing Python 3.10.13, creating and activating the virtual environment, and installing Studio’s Python dependencies, please refer to the [Build Your Python Virtual Environment](./local_dev_host.md#build-your-python-virtual-environment) section in our Local Development with host guide.

### Note about psycopg2

The packages `postgresql-12`, `postgresql-contrib`, and `postgresql-server-dev-all` are required to build the `psycopg2` Python driver.

## Install Frontend Dependencies

For guidance on installing Node 20.X, pnpm, and all required frontend dependencies, running the services, initializing Studio, and running the development server , please refer to the [Install Frontend Dependencies](./local_dev_host.md#install-frontend-dependencies) section in our Local Development with host guide.

## Access Kolibri Studio

Either of the above commands will take a few minutes to build the frontend. When it's done, you can sign in with the account created by the `pnpm run devsetup` command:

* URL: <http://localhost:8080/accounts/login/>
* Username: `a@a.com`
* Password: `a`

## Contributing to the Codebase with Visual Studio Code and WSL

Once you have completed the setup of Kolibri Studio in your WSL environment using the terminal, you can use Visual Studio Code (VS Code) to open the project and start contributing to the codebase. Here’s how you can do it:

### Step 1: Install Visual Studio Code

1. **Download and Install VS Code**:
   * Download VS Code from the [official website](https://code.visualstudio.com/).
   * Install it on your Windows machine.

### Step 2: Install the Remote - WSL Extension

1. **Open VS Code**.
2. **Go to the Extensions View**:
   * Click on the Extensions icon in the Activity Bar on the side of the window or press `Ctrl+Shift+X`.
3. **Search for "Remote - WSL"**:
   * Install the extension by Microsoft.

### Step 3: Connect VS Code to WSL

1. **Open the Command Palette**:
   * Press `Ctrl+Shift+P` to open the Command Palette.
2. **Select "Remote-WSL: New Window"**:
   * This will open a new VS Code window connected to your WSL environment.

### Step 4: Open Your Project in VS Code

1. **In the WSL-connected VS Code Window**:
   * Use the File Explorer to open your `~/studio` directory.
   * You can do this by selecting `File > Open Folder` and navigating to `~/studio`.

### Running the Project in VS Code

Now that you have your project open in VS Code, you can run the same commands you used in the terminal to activate the environment and start the services:

1. **Open the Integrated Terminal in VS Code**:
   * You can open the terminal by selecting `Terminal > New Terminal` from the menu or by pressing \`Ctrl+\`\`.
2. **Activate the Python Virtual Environment**:

   ```sh
   pyenv activate studio-py3.10
   ```
3. **Run the Services**:

   ```sh
   pnpm run services
   ```
4. **Initialize the Studio**:

   ```sh
   pnpm run devsetup
   ```
5. **Start the Development Server**:

   ```sh
   pnpm run devserver:hot
   ```

By following these steps, you can set up a productive development environment in VS Code with WSL and start contributing to the Kolibri Studio codebase.
