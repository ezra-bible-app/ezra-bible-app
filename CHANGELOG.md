# Ezra Project - Changelog
All notable changes to Ezra Project are documented in this file.

<!--
## [Unreleased]
### Features
* Module search functionality (based on SWORD library search function)
* Added filter function "Recently used tags" to tags menu (filters the tag list to the last 10 used tags)
* German translation and handling of language-based chapter/verse separator for verse references
* Use localized bible book names (based on SWORD translation functionality)

### Enablers
* Internationalization support

### Enhancements
* Show bible translation id in tab titles

### Fixes
* Also show currently selected verses in verse list mode (relevant for tagged verse lists or module search results)

-->

## [0.9.0] - 2019-08-23
### Features
* Tags can now be shown in a column next to the bible text. This is particularly useful when having a lot of tags, as it
  gives more overview and makes it easier to focus on the text.
* Section titles (from SWORD modules) can now be shown/hidden based on an option in the menu.
* Information about SWORD modules can now be shown before installation when using the bible translation wizard.
* Automatic upload of information to Sentry.io in case of JavaScript bugs
* Additional packages/platforms:
  - macOS support (macOS build produces signed & notarized DMGs compatible with macOS 10.14 Mojave)
  - Installer for Windows app
  - OpenSuse Leap 15.1 package
  - Debian 10 package
  - Linux Mint 18 package

### Enhancements
* Added module location as another attribute to module information dialog
* Show number of tagged verses in title of tagged verse list popup
* Show SWORD version in bible module info dialogue
* Added Windows build instructions ([#2][i2])
* Upgraded Electron from 4.2.6 to 4.2.9

### Fixes
* Corrected bug with Sword paths on Windows and Unix. Now both the user path and the global path gets evaluated correctly both on Windows and on Unix.
* Only disable close button of first tab when it's the last one
* Remember the last selected bible translation and set that as a default for new tabs
* Properly rename tab titles containing tags after tag has been renamed
* Sword backend: Also retrieve empty verses, but only if corresponding bible book is generally existing (applies to John 5:4 for some translations)
* Optimized package size (when packaging remove build artifacts not necessary for production)

[i2]: https://github.com/tobias-klein/ezra-project/issues/2

## [0.8.1] - 2019-06-21
### Features
* Sync functionality for Sword modules that are already existing locally: On startup any modules not yet used by Ezra Project are imported into the database.

### Enhancements
* Link with static Sword library (version 1.8.1), so that dependency to specific Sword package can be avoided.
* Streamlined startup
  * Upgrade the database using migrations (based on Umzug library)
  * Loading indicator for slower systems

### Fixes
* sword.conf file is not created anymore. This "overwrote" the Sword module path in the previous releases. On Windows, modules are found both in the user directory and the "all users" directory. ([#5][i5])
* Support for all languages of ISO-639-1/2/3. This enables the usage of all the available Sword modules.

[i5]: https://github.com/tobias-klein/ezra-project/issues/5


## [0.8.0] - 2019-05-30
### Features
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

### Enhancements
* Optimized language display in Bible installation wizard: Shows languages in multiple columns
* Optimized formatting for Bible book selection menu
* Usability: Verses can now be tagged/untagged also by clicking on the tag label (before this only worked with the checkbox)

### Fixes
* Improved tag loading from database making performance in loading big books (like Psalms) significantly better


## [0.7.1] - 2019-02-24
### Features
* Windows support

### Enhancements
* Improved layout of toolbar
* Automatic detection of books available in the current Bible translation, with adaption of the book selection menu

### Fixes
* Improved performance for Bible installation wizard (UI does not block anymore for certain actions)

## [0.6.0] - 2019-02-03
This is the initial public release of Ezra Project for the Linux desktop.
### Features
* Add/remove Bible translations from SWORD repositories
* Browse Bible books
* Create tags and assign them to verses
* Show lists of tagged verses
