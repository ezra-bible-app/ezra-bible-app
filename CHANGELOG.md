# Ezra Project - Changelog
All notable changes to Ezra Project are documented in this file.

<!--
## [Unreleased]
### Added
* macOS support
* Automatic upload of crash information to Sentry.io in case of crashes

### Fixed
* Corrected bug with Sword paths on Windows and Unix. Now both the user path and the global path gets evaluated both on Windows and on Unix.
* Only disable close button of first tab when it's the last one
* Remember the last selected bible translation and set that as a default for new tabs
* Optimized package size (when packaging remove build artifacts not necessary for production)

-->

## [0.8.1] - 2019-06-21
### Added
* Sync functionality for Sword modules that are already existing locally: On startup any modules not yet used by Ezra Project are imported into the database.

### Changed
* Link with static Sword library (version 1.8.1), so that dependency to specific Sword package can be avoided.
* Streamlined startup
  * Upgrade the database using migrations (based on Umzug library)
  * Loading indicator for slower systems

### Fixed
* sword.conf file is not created anymore. This "overwrote" the Sword module path in the previous releases. On Windows, modules are found both in the user directory and the "all users" directory. ([#5][i5])
* Support for all languages of ISO-639-1/2/3. This enables the usage of all the available Sword modules.

[i5]: https://github.com/tobias-klein/ezra-project/issues/5


## [0.8.0] - 2019-05-30
### Added
* Tabbed user interface
  * Each tab can hold Bible text or tagged verse lists
  * Tabs are saved after every change and loaded when starting Ezra Project
* Search within the current tab (similar to the search function in browsers)
  * `CTRL + f` opens a search input field
  * Results are highlighted within the text
  * Results are highlighted on the navigation bar
  * Navigation for jumping between results
* Word file export functionality for tagged verse lists
* Info popup for Bible translation-related information (shows meta information from the `*.conf` files that come with each SWORD module)
* New vertical navigation bar to the left of the Bible text
  * Shows chapters in case of a Bible book
  * Shows Bible books in case of a tagged verse list

### Changed
* Optimized language display in Bible installation wizard: Shows languages in multiple columns
* Optimized formatting for Bible book selection menu
* Usability: Verses can now be tagged/untagged also by clicking on the tag label (before this only worked with the checkbox)

### Fixed
* Improved tag loading from database making performance in loading big books (like Psalms) significantly better


## [0.7.1] - 2019-02-24
### Added
* Windows support

### Changed
* Improved layout of toolbar
* Automatic detection of books available in the current Bible translation, with adaption of the book selection menu

### Fixed
* Improved performance for Bible installation wizard (UI does not block anymore for certain actions)

## [0.6.0] - 2019-02-03
This is the initial public release of Ezra Project for the Linux desktop.
### Added
* Add/remove Bible translations from SWORD repositories
* Browse Bible books
* Create tags and assign them to verses
* Show lists of tagged verses
