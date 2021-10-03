# Building Ezra Bible App

Independent of the operating system, ensure to use a compatible nodejs version. We're currently using v14.x (Active LTS), which is supported until 2023-04-30.
This is the version currently used for development and testing. Compatibility with other versions cannot necessarily be guaranteed.

## Windows

On Windows Ezra Bible App is built using a pre-built SWORD library from the repository [sword-build-win32](https://github.com/ezra-project/sword-build-win32) to ease the build process. After having installed the [windows-build-tools][windows-build-tools] (VS 2015 Compiler) and the Ezra Bible App sources the build process can be simply invoked using the batch file build_win32.bat.

### Setup and build

1. Install [git](https://git-scm.com/download/win) and [nodejs](https://nodejs.org). Ensure to install the x86 version of nodejs 14.x.
2. Install [windows-build-tools][windows-build-tools] (VS 2015 Compiler) by running the following command in an administrator powershell:\
`npm install --vs2015 --global windows-build-tools`
3. Clone Ezra Bible App from git repo or unpack sources from release
4. Install dependencies and rebuild native extensions by running this command in the project dir: `.\build_win32.bat`

After performing these steps you can run Ezra Bible App by running this command in the project dir: `npm start`

[windows-build-tools]: https://www.npmjs.com/package/windows-build-tools

### Create a release directory

To create a release directory that contains all necessary files, run the following command in the project dir: `npm run package-win`

After running the above command you will find a new directory `<project-dir>\release\ezra-project-win32-ia32`.
The application binary within that directory is named `ezra-project.exe`.

### Create an installer

To create an installer, run the following command in the project dir: `npm run installer-win`

After running the above command you will find a new installer binary in `<project-dir>\release\packages`.
The installer binary within that directory is named `ezra_project-x.y.z-setup.exe`.

## Linux

### Install dependencies

The following dependencies are valid for Debian/Ubuntu based distributions. Ezra Bible App has been successfully built for other distributions as well (Linux Mint 18, Debian 10, Fedora 33, OpenSuse, CentOS). To see how the dependencies look like for your distribution, have a look at the Docker files [here](https://github.com/ezra-project/ezra-project/tree/master/docker).

Install compiler/lib dependencies by running the following command: `sudo apt-get install build-essential npm nodejs libsqlite3-0 libcurl4-gnutls-dev libicu-dev pkg-config git cmake`

### Setup and build

1. Clone Ezra Bible App from git repo or unpack sources from release
2. Install Ezra Bible App dependencies by running this commmand in the project dir: `npm install`
3. Rebuild C/C++ dependencies by running this command in the project dir: `npm run rebuild`

After performing these steps you can run Ezra Bible App by running this command in the project dir: `npm start`

### Create a release directory

To create a release directory that contains all necessary files, run the following command in the project dir: `npm run package-linux`

After running the above command you will find a new directory `<project-dir>/release/ezra-project-linux-x64`.
The application binary within that directory is named `ezra-project`.

### Generate a package

**TODO**

## macOS

The following instructions have been verified on macOS _Big Sur_. The assumption is that commands are run in the _Terminal_ application.

### Install dependencies

1. Install XCode from the App Store
2. Install Command Line Developer Tools (contains Compiler toolchain, svn, git, etc.) by running this command: `xcode-select --install`   
2. Install the homebrew package manager by running this command: `/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"`
3. Install some packages with homebrew by running this command: `brew install pkg-config cmake npm nvm icu4c`
4. Install the macOS specific npm package electron-installer-dmg by running this command: `npm install -g electron-installer-dmg`

### Setup and build

1. Ensure that you have a compatible nodejs version (14.x). You should be able to switch node versions using the nvm command (see [this blog post](https://michael-kuehnel.de/node.js/2015/09/08/using-vm-to-switch-node-versions.html)).
2. Clone Ezra Bible App from git repo or unpack sources from release
3. Install Ezra Bible App dependencies by running this commmand in the project dir: `npm install`
4. Rebuild C/C++ dependencies by running this command in the project dir: `npm run rebuild`

After performing these steps you can run Ezra Bible App by running this command in the project dir: `npm start`

### Creating a release directory

To create a release directory that contains all necessary files, run the following command in the project dir: `npm run package-mac`

After the process is completed you will find a new directory `<project-dir>/release/Ezra Bible App-darwin-x64/`.
In that directory you find an application package named `Ezra Bible App.app`.

### Signing and notarizing the app

Prerequisite: Apple Developer account

Before you can sign and notarize Ezra Bible App on macOS you need to have the code signing certificates from your Apple developer account available on your Mac.

To sign and notarize Ezra Bible App run the following commands in the project dir.

`npm run sign-mac`

`npm run notarize-mac`

You will be asked for your Apple ID and the corresponding password. The scripts (sign_mac.sh, notarize_mac.sh) will then sign and notarize the app. This is a lengthy process (may take 20-25 minutes).

### Creating a DMG image for distribution

Once you have signed and notarized the app you can create a DMG image for distribution by running the following command in the project dir:

`npm run dmg-mac`

After the process is completed you will find a new DMG file at `<project-dir>/release/ezra-project.dmg`.
