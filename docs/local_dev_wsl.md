# Supplemental instructions for WSL

This guide is a supplement to Kolibri Studio's [local development instructions](./local_dev.md), specifically for using Windows Subsystem for Linux (WSL).

## Preparing WSL and Ubuntu
Before setting up Studio, you will need to prepare your WSL environment. This includes installing WSL (if not already) and Ubuntu, and setting up your Linux username and password.

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

### Update and Upgrade Packages

Open your WSL terminal and update the package lists:

```sh
sudo apt update
sudo apt upgrade -y
```

You're now ready to fork the Kolibri Studio repository and set up your development environment using the [local development instructions](./local_dev.md).

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
   make devrun-services
   ```
4. **Initialize the Studio**:

   ```sh
   make devrun-setup
   ```
5. **Start the Development Server**:

   ```sh
   make devrun-server
   ```

By following these steps, you can set up a productive development environment in VS Code with WSL and start contributing to the Kolibri Studio codebase.
