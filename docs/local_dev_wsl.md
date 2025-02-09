# Kolibri Studio Local Setu**p Guide** Using WSL

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

### Install Volta

Follow the instructions on the [Volta installation page](https://docs.volta.sh/guide/getting-started) to install Volta. Here are the commands to install Volta:

```sh
curl https://get.volta.sh | bash
```

Add Volta to your shell configuration by adding the following line to your `~/.bashrc` file:

```sh
echo 'export PATH="$HOME/.volta/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Install pyenv and pyenv-virtualenv

Follow the instructions on the [pyenv installation page](https://github.com/pyenv/pyenv#installation) to install pyenv and pyenv-virtualenv. Here are the commands to install pyenv:

```sh
curl https://pyenv.run | bash
```

Add pyenv to your shell configuration by adding the following lines to your `~/.bashrc` file:

```sh
echo -e '\n# Pyenv' >> ~/.bashrc
echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.bashrc
echo 'export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.bashrc
echo 'eval "$(pyenv init --path)"' >> ~/.bashrc
echo 'eval "$(pyenv init -)"' >> ~/.bashrc
echo 'eval "$(pyenv virtualenv-init -)"' >> ~/.bashrc
source ~/.bashrc
```

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

## Configure .bashrc

Add the following configurations to your `~/.bashrc` file to ensure that pyenv and other tools are correctly set up:

```sh
nano ~/.bashrc
```

Add the following lines:

```sh
# Volta
export PATH="$HOME/.volta/bin:$PATH"

# Pyenv
export PYENV_ROOT="$HOME/.pyenv"
export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init --path)"
eval "$(pyenv init -)"
eval "$(pyenv virtualenv-init -)"

# PostgreSQL
export PATH="/usr/lib/postgresql/12/bin:$PATH"
```

Save and exit the file (Ctrl + X, then Y, then Enter). Reload the `.bashrc` file:

```sh
source ~/.bashrc
```

## Set Up Python Virtual Environment
To determine what version of Python studio needs, you can check the `runtime.txt` file:
```bash
$ cat runtime.txt
# This is the required version of Python to run Studio currently.
# This is determined by the default Python 3 version that is installed
# inside Ubuntu Bionic, which is used to build images for Studio.
# We encode it here so that it can be picked up by Github's dependabot
# to manage automated package upgrades.
python-3.10.13
```
### Install the Required Python Version

```sh
pyenv install 3.10.13
pyenv virtualenv 3.10.13 studio-py3.10
pyenv activate studio-py3.10
```

### Install Python Dependencies

Navigate to your studio directory and install the Python dependencies:

```sh
cd ~/studio
pip install -r requirements.txt -r requirements-dev.txt
```

To deactivate the virtual environment:

```sh
pyenv deactivate
```

### Note about psycopg2

The packages `postgresql-12`, `postgresql-contrib`, and `postgresql-server-dev-all` are required to build the `psycopg2` Python driver.

## Install Frontend Dependencies

The project requires Node 16.X as the runtime and Yarn >= 1.22.22 as the package manager. We use [Volta](https://docs.volta.sh/guide/getting-started) to manage these automatically. Ensure you have Volta installed and your shell configured to use Volta. You can then install all the dependencies by running:

```sh
yarn install
```

## Run the Services

Having installed all the necessary services, initialized your Python virtual environment, and installed Yarn, you're now ready to start the services. Open a separate terminal/terminal-tab and run:

```sh
yarn run services
```

## Initialize Studio

With the services running, in a separate terminal/terminal-tab, initialize the database for Studio development purposes:

```sh
yarn run devsetup
```

## Run the Development Server

With the services running and the database initialized, start the development server:

```sh
yarn run devserver:hot  # with Vue hot module reloading
# or
yarn run devserver  # without hot module reloading
```

## Access Kolibri Studio

Either of the above commands will take a few minutes to build the frontend. When it's done, you can sign in with the account created by the `yarn run devsetup` command:

* URL: <http://localhost:8080/accounts/login/>
* Username: `a@a.com`
* Password: `a`

### Special Note

If you encounter an issue where the localhost URL is accessible but the page shows only the Studio header with a blank page, you can fix it by updating the `webpack.config.js` file. This issue has been discussed in the [GitHub discussion](https://github.com/learningequality/studio/discussions/4871).

#### Steps to Fix the Blank Page Issue

1. **Open `webpack.config.js`**:

   ```sh
   nano ~/studio/webpack.config.js
   ```
2. **Update the `devServer` Section**: Add the following line to the `devServer` section to bind to all network interfaces:

   ```js
   devServer: {
     host: '0.0.0.0',
     // other configurations...
   }
   ```
3. **Update the `publicPath` in Development Mode**: Change the `publicPath` in development mode from `http://127.0.0.1:4000/dist/` to your WSL IP address. For example:

   ```js
   publicPath: 'http://172.28.128.96:4000/dist/',
   ```

   You can find your WSL IP address by running:

   ```sh
   hostname -I
   ```
4. **Save and Exit the File**: Save the changes and exit the file (Ctrl + X, then Y, then Enter).
5. **Restart the Development Server**:

   ```sh
   yarn run devserver:hot  # with Vue hot module reloading
   # or
   yarn run devserver  # without hot module reloading
   ```

### Keep `webpack.config.js` Out of Git Tracking

Since this change is specific to WSL and may not be needed for other environments, you should keep the `webpack.config.js` file out of Git tracking. Run the following commands to untrack the file:

```sh
git update-index --assume-unchanged path/to/your/webpack.config.js
```

To revert this change and track the file again, you can use:

```sh
git update-index --no-assume-unchanged path/to/your/webpack.config.js
```

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
   yarn run services
   ```
4. **Initialize the Studio**:

   ```sh
   yarn run devsetup
   ```
5. **Start the Development Server**:

   ```sh
   yarn run devserver:hot
   ```

By following these steps, you can set up a productive development environment in VS Code with WSL and start contributing to the Kolibri Studio codebase.