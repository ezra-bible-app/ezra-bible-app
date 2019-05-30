# Changelog
All notable changes to Ezra Project are documented in this file.

## [Unreleased]

## [0.8.0] - 2019-05-30
### Added
* Tabbed user interface
  * Each tab can hold bible text or tagged verse lists
  * Tabs are saved persistently after every change and loaded again when newly starting Ezra Project
* Search within current tab (similar as the search function in browsers)
  * CTRL + F opens a search input field
  * Results are highlighted within the text
  * Results are highlighted on navigation bar
  * Navigation for jumping between results
* Word file export functionality for tagged verse lists
* Info popup for bible translation related information (shows meta information from the *.conf files that come with each SWORD module)
* New vertical navigation bar to the left of the bible text
  * Shows chapters in case of a bible book
  * Shows bible books in case of a tagged verse list

### Changed
* Optimized language display in bible installation wizard: Show languages in multiple columns
* Optimized formatting for bible book selection menu

### Fixed
* Improved performance of tag loading from database, performance in big books like Psalms is significantly better now


## [0.7.1] - 2019-02-24
### Added
* Windows support

### Changed
* Improved layout of toolbar
* Automatic detection of books available in the current bible translation - with adaption of the book selection menu

### Fixed
* Improved performance for bible installation wizard (UI does not block anymore for certain actions)

## [0.6.0] - 2019-02-03
This is the initial public release of Ezra Project for the Linux desktop.
### Added
* Add/remove bible translations from SWORD repositories
* Browse bible books
* Create tags and assign them to verses
* Show lists of tagged verses
