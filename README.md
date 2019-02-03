# Ezra Project
Ezra Project is a bible study software focussing on topical study based on keywords/tags.
It works with [SWORD bible translation modules](http://www.crosswire.org/sword) and thus enables bible study in many languages. It currently only runs on Linux, but Windows support is planned for the future. Click [here](https://github.com/tobias-klein/ezra-project/releases/latest) to get the latest release.

![Ezra Project 0.6.0](/screenshots/ezra_project_0_6_0.png?raw=true "Ezra Project 0.6.0")

## Installation
Before you can run Ezra Project you need to install the [SWORD library](http://www.crosswire.org/sword). On Debian/Ubuntu distributions the package is called [libsword11v5](https://pkgs.org/download/libsword11v5).

Once the SWORD library is available, install Ezra Project by downloading the tar.gz file and extracting it in a directory of your choice. After that, you can execute Ezra Project using the binary *ezra-project* in the toplevel folder.

## Technology
Ezra Project is an [Electron](https://electronjs.org/) application, which makes it a web-based desktop application. It uses [SQLite](https://www.sqlite.org) as its database and HTML with [jQuery UI](https://jqueryui.com/) for its frontend. Bible translation modules are managed using the [ezra-sword-interface](https://github.com/tobias-klein/ezra-sword-interface).
