# Building Ezra Bible App

Independent of the operating system, ensure to use a compatible nodejs version. We're currently using v18.x, which is supported until April 2025.
This is the version currently used for development and testing. Compatibility with other versions cannot necessarily be guaranteed.

## Windows

On Windows Ezra Bible App is built using a pre-built SWORD library from the repository [sword-build-win32](https://github.com/ezra-bible-app/sword-build-win32) to ease the build process. After having cloned the Ezra Bible App sources the build process can be simply invoked using the command `npm run build-win`.

### Setup and build

1. Install [git](https://git-scm.com/download/win).
2. Install [nodejs](https://nodejs.org). Important note: Ensure to install the *x86 version* (32-bit) of nodejs 14.x.
   Furthermore, when the setup assistant asks about *Tools for native modules*, make sure to tick the checkbox *Automatically install the necessary tools*. This will then install the windows build tools required to build the native addons of Ezra Bible App.

![Tools for native addons](https://raw.githubusercontent.com/ezra-bible-app/ezrabibleapp.net/master/assets/screenshots/nodejs_tools_for_native_addons.png)

3. Install Python 2 (needed by sqlite3 module) by running this command in an admin cmd shell (*Chocolatey* should be available based on the nodejs installation, otherwise you need to [install it first](https://chocolatey.org/install#individual)): `choco install python2`
4. Clone Ezra Bible App from the git repo or unpack the sources from a release.
5. Install dependencies and rebuild native extensions by running this command in the project dir: `npm run build-win`.

After performing these steps you can run Ezra Bible App by running this command in the project dir: `npm start`

[windows-build-tools]: https://www.npmjs.com/package/windows-build-tools

### Create a release directory

To create a release directory that contains all necessary files, run the following commands in the project dir: `npm run package-win`

After running the above command you will find a new directory `<project-dir>\release\ezra-bible-app-win32-ia32`.
The application binary within that directory is named `ezra-bible-app.exe`.

### Create an installer

To create an installer, run the following command in the project dir: `npm run installer-win`

After running the above command you will find a new installer binary in `<project-dir>\release\packages`.
The installer binary within that directory is named `ezra_bible_app-x.y.z-setup.exe`.

## Linux

### Install dependencies

The following dependencies are valid for Debian/Ubuntu based distributions. Ezra Bible App has been successfully built for other distributions as well (Linux Mint 18, Debian 10, Fedora 33, OpenSuse, CentOS). To see how the dependencies look like for your distribution, have a look at these Docker files [here](https://github.com/ezra-bible-app/ezra-bible-app-docker/tree/master/docker).

Install compiler/lib dependencies by running the following command: `sudo apt-get install build-essential npm nodejs libsqlite3-0 libcurl4-gnutls-dev zlib1g-dev libbz2-dev liblzma-dev pkg-config git cmake subversion`

### Setup and build

1. Clone Ezra Bible App from git repo or unpack sources from release
2. Install Ezra Bible App dependencies by running this commmand in the project dir: `npm install`
3. Rebuild C/C++ dependencies by running this command in the project dir: `npm run rebuild`

After performing these steps you can run Ezra Bible App by running this command in the project dir: `npm start`

### Create a release directory

To create a release directory that contains all necessary files, run the following commands in the project dir:

* `npm run purge-build-artifacts`
* `npm run package-linux`

After running the above command you will find a new directory `<project-dir>/release/ezra-bible-app-linux-x64`.
The application binary within that directory is named `ezra-bible-app`.

### Generate a package

**TODO**

## macOS

The following instructions have been verified on macOS _Big Sur_. The assumption is that commands are run in the _Terminal_ application.

### Install dependencies

1. Install XCode from the App Store
2. Install Command Line Developer Tools (contains Compiler toolchain, git, etc.) by running this command: `xcode-select --install`   
2. Install the homebrew package manager by running this command: `/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"`
3. Install some packages with homebrew by running this command: `brew install pkg-config cmake subversion npm nvm icu4c`
4. Install the macOS specific npm package electron-installer-dmg by running this command: `npm install -g electron-installer-dmg`

### Setup and build

1. Ensure that you have a compatible nodejs version (18.x). You should be able to switch node versions using the nvm command (see [this blog post](https://michael-kuehnel.de/node.js/2015/09/08/using-vm-to-switch-node-versions.html)).
2. Clone Ezra Bible App from git repo or unpack sources from release
3. Install Ezra Bible App dependencies by running this commmand in the project dir: `npm install`
4. Rebuild C/C++ dependencies by running this command in the project dir: `npm run rebuild`

After performing these steps you can run Ezra Bible App by running this command in the project dir: `npm start`

### Creating a release directory

To create a release directory that contains all necessary files, run the following commands in the project dir:

* `npm run purge-build-artifacts`
* `npm run package-mac`

After the process is completed you will find a new directory `<project-dir>/release/Ezra Bible App-darwin-x64/`.
In that directory you find an application package named `Ezra Bible App.app`.

### Signing and notarizing the app

Prerequisite: Apple Developer account

Before you can sign and notarize Ezra Bible App on macOS you need to have the code signing certificates from your Apple developer account available on your Mac.

To sign Ezra Bible App run the following command in the project dir.

`npm run sign-mac`

Signing the app will take a minute or two.

To notarize Ezra Bible App run the following command in the project dir.

`npm run notarize-mac`

You will be asked for your Apple ID, the corresponding password and your Team ID (get the Team ID from your [Apple Developer account page](https://developer.apple.com/account)). This is a lengthy process (may take 20-25 minutes). Once notarization is done you will see the following message:

`App was notarized successfully!`

### Creating a DMG image for distribution

Once you have signed and notarized the app you can create a DMG image for distribution by running the following command in the project dir:

`npm run dmg-mac`

After the process is completed you will find a new DMG file at `<project-dir>/release/Ezra Bible App.dmg`.
