# Ezra Project
"_For Ezra had set his heart to study the Law of the LORD, and to do it and to teach his statutes and rules in Israel._" Ezra 7:10

Ezra Project is a bible study software focussing on topical study based on keywords/tags. This program helps the user to easily create and manage topical verse lists. Ezra Project works with [SWORD bible translation modules](http://www.crosswire.org/sword) and thus enables bible study in many languages. It runs on Linux and Windows. Click [here](https://github.com/tobias-klein/ezra-project/releases/latest) to get the latest release.

![Ezra Project 0.6.0](/screenshots/ezra_project_0_6_0.png?raw=true "Ezra Project 0.6.0")

## Installation
### Windows
Install Ezra Project by downloading the zip file and extracting it in a directory of your choice. After that, you can execute Ezra Project using the binary *ezra-project.exe* in the toplevel folder.

### Linux
Before you can run Ezra Project you need to install the [SWORD library](http://www.crosswire.org/sword). On Debian/Ubuntu distributions the package is called [libsword11v5](https://pkgs.org/download/libsword11v5).

Once the SWORD library is available install Ezra Project by downloading the tar.gz file and extracting it in a directory of your choice. After that, you can execute Ezra Project using the binary *ezra-project* in the toplevel folder.

## Usage / Howto

Watch [this video howto](https://www.youtube.com/watch?v=b8gScfa0MqM) to understand how to use Ezra Project.

## Technology
Ezra Project is a web-based desktop application based on [Electron](https://electronjs.org/). It is programmed in JavaScript, uses [SQLite](https://www.sqlite.org) as its database and HTML with [jQuery UI](https://jqueryui.com/) for its frontend. Bible translation modules are managed using the [ezra-sword-interface](https://github.com/tobias-klein/ezra-sword-interface).

Furthermore, the following components are used (among others):
* [Sequelize](http://docs.sequelizejs.com) [ORM](https://en.wikipedia.org/wiki/Object-relational_mapping) for handling database access
* [Pug](https://pugjs.org) template engine for rendering verse list
* [jQuery Steps](http://www.jquery-steps.com) for the bible translation wizard
* [ISO-639-1](https://github.com/meikidd/iso-639-1) for turning bible translation language codes into readable language names
* [SpinKit](https://github.com/tobiasahlin/SpinKit) for CSS-animated loading spinners

## Feedback
To give feedback (bug reports, feature requests) please use the Github issue system.
Click [here](https://github.com/tobias-klein/ezra-project/issues/new) to file a new Issue for Ezra Project.
