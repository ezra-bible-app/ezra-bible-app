# Ezra Project
"_For Ezra had set his heart to study the Law of the LORD, and to do it and to teach his statutes and rules in Israel._" Ezra 7:10

Ezra Project is an open source bible study tool focussing on topical study based on keywords/tags. This program helps the user to easily create and manage topical verse lists. Ezra Project works with [SWORD bible translation modules](http://www.crosswire.org/sword) and thus enables bible study in many languages. It runs on Linux and Windows. Click [here](https://github.com/tobias-klein/ezra-project/releases/latest) to get the latest release.

![Ezra Project 0.8.0](/screenshots/ezra_project_0_8_0.png?raw=true "Ezra Project 0.8.0")

## Installation
### Windows
Install Ezra Project by downloading the zip file and extracting it in a directory of your choice. After that, you can execute Ezra Project using the binary *ezra-project.exe* in the toplevel folder.

### Linux
Install Ezra Project by downloading a package for your distribution. After installing the package you will find "Ezra Project" in your application menu.

* **Ubuntu 18.04 / 19.04:** Dowload the appropriate Debian package attached to the [latest release][latest] and install, e.g.: `sudo dpkg -i ezra-project_ubuntu1904_0.8.1_amd64.deb`.
* **Fedora 29 / 30 & CentOS 7:** Download the appropriate RPM package package attached to the [latest release][latest] and install, e.g.: `sudo dnf localinstall ezra-project_fedora29_0.8.1_x86_64.rpm`.
* **Arch Linux:** Use your favorite AUR package manager to install *[ezra-project](https://aur.archlinux.org/packages/ezra-project)* (or *[ezra-project-git](https://aur.archlinux.org/packages/ezra-project-git)*), e.g.: `yay -S ezra-project`.

## Usage / Howto

Watch [this video howto](https://www.youtube.com/watch?v=b8gScfa0MqM) to understand how to use Ezra Project.

## Technology
Ezra Project is a web-based desktop application based on [Electron](https://electronjs.org/). It is programmed in JavaScript, uses [SQLite](https://www.sqlite.org) as its database and HTML with [jQuery UI](https://jqueryui.com/) for its frontend. Bible translation modules are managed using [node-sword-interface](https://github.com/tobias-klein/node-sword-interface).

Furthermore, the following components are used (among others):
* [Sequelize](http://docs.sequelizejs.com) [ORM](https://en.wikipedia.org/wiki/Object-relational_mapping) for handling database access
* [Umzug](https://github.com/sequelize/umzug) Migration library for handling database schema upgrades
* [Pug](https://pugjs.org) template engine for rendering verse list
* [jQuery Steps](http://www.jquery-steps.com) for the bible translation wizard
* [ISO-639-3](https://github.com/wooorm/iso-639-3) for turning bible translation language codes into readable language names
* [officegen](https://github.com/Ziv-Barber/officegen) for exporting tagged verse lists to Word documents
* [SpinKit](https://github.com/tobiasahlin/SpinKit) for CSS-animated loading spinners

## Building Ezra Project
### Windows

On Windows Ezra Project is built using a pre-built SWORD library from the repository [sword-win32](https://github.com/tobias-klein/sword-win32) to ease the build process. After having installed the [windows-build-tools][windows-build-tools] (VS 2015 Compiler) and the Ezra Project sources the build process can be simply invoked using the batch file build_win32.bat.

#### Setup and build ####

1. Install [git](https://git-scm.com/download/win) and [nodejs](https://nodejs.org).
2. Install [windows-build-tools][windows-build-tools] (VS 2015 Compiler) by running the following command in an administrator powershell: `npm install --vs2015 --global windows-build-tools`.
3. Clone Ezra Project from git repo or unpack sources from release
4. Install dependencies and rebuild native extensions by running this command in the project dir: `.\build_win32.bat`

After performing these steps you can run Ezra Project by running this command in the project dir: `npm start`

[windows-build-tools]: https://www.npmjs.com/package/windows-build-tools

#### Create a release directory ####

To create a release directory that contains all necessary files, run the following command in the project dir: `npm run package-win`

After running the above command you will find a new directory `<project-dir>\release\ezra-project-win32-ia32`.
The application binary within that directory is named `ezra-project.exe`.

#### Create an installer ####

Since the installer is platform-specific you first need to install the package [electron-installer-windows](https://github.com/electron-userland/electron-installer-windows) by running the following command in an administrator powershell: `npm install --global electron-installer-windows`

To create an installer, run the following command in the project dir: `npm run installer-win`

After running the above command you will find a new installer binary in `<project-dir>\release\packages`.
The installer binary within that directory is named `ezra_project-x.y.z-setup.exe`.

### Linux

The following build instructions are valid for Debian/Ubuntu based distributions.

#### Install dependencies ####

Install compiler/lib dependencies by running the following command: `sudo apt-get install build-essential npm nodejs libsqlite3-0 libcurl4-gnutls-dev libicu-dev pkg-config git cmake subversion`

#### Setup and build ####

1. Clone Ezra Project from git repo or unpack sources from release
2. Install Ezra Project dependencies by running this commmand in the project dir: `npm install`
3. Rebuild C/C++ dependencies by running this command in the project dir: `npm run rebuild`

After performing these steps you can run Ezra Project by running this command in the project dir: `npm start`

#### Create a release directory ####

To create a release directory that contains all necessary files, run the following command in the project dir: `npm run package-linux`

After running the above command you will find a new directory `<project-dir>/release/ezra-project-linux-x64`.
The application binary within that directory is named `ezra-project`.

### Mac

The following instructions have been verified on macOS _Mojave_. The assumption is that commands are run in the _Terminal_ application.

#### Install dependencies ####

1. Install XCode from the App Store
2. Install Command Line Developer Tools (contains Compiler toolchain, svn, git, etc.) by running this command: `xcode-select --install`   
2. Install the homebrew package manager by running this command: `/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"`
3. Install some packages with homebrew by running this command: `brew install pkg-config cmake npm`

#### Setup and build ####

1. Clone Ezra Project from git repo or unpack sources from release
2. Install Ezra Project dependencies by running this commmand in the project dir: `npm install`
3. Rebuild C/C++ dependencies by running this command in the project dir: `npm run rebuild`

After performing these steps you can run Ezra Project by running this command in the project dir: `npm start`

#### Creating a release directory ####

To create a release directory that contains all necessary files, run the following command in the project dir: `npm run package-mac`

After the process is completed you will find a new directory `<project-dir>/release/ezra-project-linux-x64`.
The application binary within that directory is named `ezra-project`.

#### Signing and notarizing the app ####

Prerequisite: Apple Developer account

Before you can sign and notarize Ezra Project on macOS you need to have the code signing certificates from your Apple developer account available on your Mac.

To sign and notarize Ezra Project run the following commands in the project dir.

`npm run sign-mac`

`npm run notarize-mac`

You will be asked for your Apple ID and the corresponding password. The scripts (sign_mac.sh, notarize_mac.sh) will then sign and notarize the app. This is a lengthy process (may take 20-25 minutes).

#### Creating a DMG image for distribution ####

Once you have signed and notarized the app you can create a DMG image for distribution by running the following command in the project dir:

`npm run dmg-mac`

After the process is completed you will find a new DMG file at `<project-dir>/release/ezra-project.dmg`.

## Feedback
To give feedback (bug reports, feature requests) please use the Github issue system.
Click [here](https://github.com/tobias-klein/ezra-project/issues/new) to file a new Issue for Ezra Project.

[latest]: https://github.com/tobias-klein/ezra-project/releases/latest

## Join the team!
Your contributions to Ezra Project are very welcome!
At the moment this is a small project with just one maintainer. It would be great to have a team developing this software.
Ideally you should bring some experience in working with web-based frontends, specifically HTML, CSS, JavaScript. Furthermore, experience with relational database design is a plus. Feel free to drop me an email ([contact@tklein.info](mailto:contact@tklein.info)) if you are interested in joining the team!
