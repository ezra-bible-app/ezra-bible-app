# Ezra Project - Changelog
All notable changes to Ezra Project are documented in this file.

<!--
## [Unreleased]
-->

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
