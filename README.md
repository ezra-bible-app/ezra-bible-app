# Ezra Project
Ezra Project is a bible study software focussing on topical study based on keywords/tags.
It works with [SWORD bible translation modules](http://www.crosswire.org/sword) and thus enables bible study in many languages. It currently only runs on Linux, but Windows support is planned for the future.

## Technology
Ezra Project is an [Electron](https://electronjs.org/) application, which makes it a web-based desktop application. It uses [SQLite](https://www.sqlite.org) as its database and HTML with [jQuery UI](https://jqueryui.com/) for its frontend.

## Installation

Before you can run Ezra Project you need to install the [SWORD library](http://www.crosswire.org/sword). On Debian/Ubuntu distributions the package is called [libsword11v5](https://pkgs.org/download/libsword11v5).

Once the SWORD library is available, install Ezra Project by downloading the tar.gz file and extracting it in a directory of your choice. After that, you can execute Ezra Project using the binary *ezra-project* in the toplevel folder.
