# Ezra Project
"_For Ezra had set his heart to study the Law of the LORD, and to do it and to teach his statutes and rules in Israel._" Ezra 7:10

Ezra Project is a user-friendly, cross-platform bible study tool focussing on topical study based on keywords/tags. This program helps the user to easily create and manage topical verse lists. Ezra Project works with [SWORD bible translation modules](http://www.crosswire.org/sword) and thus enables bible study in many languages. It runs on Windows, Linux and macOS. Click [here](https://github.com/tobias-klein/ezra-project/releases/latest) to get the latest release.

![Ezra Project 0.11.0](https://raw.githubusercontent.com/tobias-klein/ezra-project/master/screenshots/ezra_project_0_11_0.png "Ezra Project 0.11.0")

## Usage / Howto

Watch [this video](https://www.youtube.com/watch?v=b8gScfa0MqM) to understand how to use Ezra Project.

## Features

Ezra Project comes with the following functionality:
* Bible browsing functionality
  * Books are opened entirely and you can scroll through the chapters seemlessly.
  * The text is shown with book introductions and section headers.
  * You can compare the bible translations of the selected verses.
  * Access to all bible translations available from [CrossWire's](http://www.crosswire.org) repositories.
  * Ezra Project uses the local Sword directories as any other Sword frontend.
* Tagging functionality - topical verse lists
  * Tag within the currently opened book or verse list.
  * Lookup all verses of a tag (show verses in the main browsing window).
  * Lookup all verses of a tag in the context of a book or verse list (show verses in small popup).
  * Export a tagged verse list to a document.
  * Show tag statistics for the currently opened book.
* Search
  * Search within the currently opened book or verse list (CTRL + f).
  * Search within the full bible translation.
  * Search with multiple words, exact phrase or Strong's number.
* Strong's dictionary
  - Strong's transcriptions/original word are displayed as hint/pop-up above the word when hovering the mouse over the corresponding word while pressing SHIFT.
  - Detailed Strong's information is shown on the bottom left in a separate box.
  - Strong's based search with link 'Find all occurrances'.
* Tabbed user interface
  * Each tab either shows a book, a tagged verse list or search results.
  * Previously opened tabs are loaded again on program start.
* User interface available in the following languages:
  * English, German, Dutch

## Upcoming Features

Ezra Project is currently on a bi-monthly release schedule. The next release [0.13.0](https://github.com/tobias-klein/ezra-project/milestone/3) is planned for May 2020 with the following new features:

* Bible browser: Parallel translation mode (#30)
* Install wizard: Upgrade functionality (#31)

## Installation
The latest installation packages for Windows, Linux and macOS can be found on [this page][latest]. Specific install instructions are below.

### Windows
Install Ezra Project by downloading the installer. The installer can then be executed with one click/double-click. Once installed, Ezra Project will open automatically and there will be a link available on your Desktop.

### Linux
Install Ezra Project by downloading a package for your distribution. After installing the package you will find "Ezra Project" in your application menu.

* **Ubuntu 18.04 / 19.04 & Debian 10 & Linux Mint 18:** Download the appropriate Debian package attached to the [latest release][latest] and install, e.g.: `sudo dpkg -i ezra-project_ubuntu1904_0.9.0_amd64.deb`.
* **Fedora 29 / 30 & CentOS 7 & OpenSuse 15.1:** Download the appropriate RPM package package attached to the [latest release][latest] and install, e.g.: `sudo dnf localinstall ezra-project_fedora29_0.9.0_x86_64.rpm`.
* **Arch Linux:** Use your favorite AUR package manager to install *[ezra-project](https://aur.archlinux.org/packages/ezra-project)* (or *[ezra-project-git](https://aur.archlinux.org/packages/ezra-project-git)*), e.g.: `yay -S ezra-project`.

### macOS
Install Ezra Project by downloading the DMG file. After opening the DMG file from Finder you can either just test-run Ezra Project (double-click the icon), or drag-and-drop the icon to the Applications folder to install it. Note, that macOS may warn you that this is an app downloaded from the internet. That message must be acknowledged before you can run the application.

## Technology
Ezra Project is a web-based desktop application based on [Electron](https://electronjs.org/). It is programmed in JavaScript, uses [SQLite](https://www.sqlite.org) as its database and HTML with [jQuery UI](https://jqueryui.com/) for its frontend. Bible translation modules are managed using [node-sword-interface](https://github.com/tobias-klein/node-sword-interface).

For more details regarding the used components have a look [here][tech].

[tech]: https://github.com/tobias-klein/ezra-project/blob/master/TECH.md

## Building Ezra Project

Have a look at the build instructions [here][build].

[build]: https://github.com/tobias-klein/ezra-project/blob/master/BUILD.md

## Feedback
To give feedback (bug reports, feature requests) please use the Github issue system.
Click [here](https://github.com/tobias-klein/ezra-project/issues/new) to file a new Issue for Ezra Project.

[latest]: https://github.com/tobias-klein/ezra-project/releases/latest

## Join the team!
Your contributions to Ezra Project are very welcome!
At the moment this is a small project with one maintainer. It would be great to have a team developing this software!
Ideally you should bring some experience in working with web-based frontends, specifically HTML, CSS, JavaScript. Furthermore, experience with relational database design is a plus. However, if you're not a developer you can still help with testing, translation and user documentation!

Feel free to drop me an email ([contact@tklein.info](mailto:contact@tklein.info)) if you are interested in joining the team!
