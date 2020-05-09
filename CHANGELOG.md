# Ezra Project - Changelog
All notable changes to Ezra Project are documented in this file.

<!--
## [0.13.0 - 2020-06-xx]
### Features

* Basic note taking functionality. Notes can be added for individual verses using Markdown syntax. ([#45][i45])

### Enhancements

* Basic icon. Note that this is just a start and we still need a nicer one than this! ([#26][i26])
* Switchable night-mode / darker color scheme. On macOS this is handled automatically based on the system settings. ([#43][i43])
* Show license information in module info dialogue. ([#51][i51])
* Enhance width of new tag / rename tag dialogues and input fields. ([#53][i53])
* Recently used tags filter in tag selection menu. ([#50][i50])
* Highlight module search results. ([#52][i52])
* Support advanced search options in tab search. ([#56][i56])
* Add new module search option: Search with extended verse boundaries ([#58][i58])

### Fixes

* Properly localize book names in tab titles. ([#41][i41])
* Fixed regression bug related to creation of verse references in case of non-ENGLISH versification. ([#54][i54])

[i26]: https://github.com/tobias-klein/ezra-project/issues/26
[i41]: https://github.com/tobias-klein/ezra-project/issues/41
[i43]: https://github.com/tobias-klein/ezra-project/issues/43
[i45]: https://github.com/tobias-klein/ezra-project/issues/45
[i51]: https://github.com/tobias-klein/ezra-project/issues/51
[i53]: https://github.com/tobias-klein/ezra-project/issues/53
[i50]: https://github.com/tobias-klein/ezra-project/issues/50
[i54]: https://github.com/tobias-klein/ezra-project/issues/54
[i52]: https://github.com/tobias-klein/ezra-project/issues/52
[i56]: https://github.com/tobias-klein/ezra-project/issues/56
[i58]: https://github.com/tobias-klein/ezra-project/issues/58

-->


## [0.12.2 - 2020-04-20]
This is a bugfix release. This release is mostly relevant for macOS.

### Fixes

* Fixed white screen error on macOS due to dependency issue with icu4c. ([#48][i48])
* Fixed broken English/Hebrew versification mapping. ([#49][i49])

[i48]: https://github.com/tobias-klein/ezra-project/issues/48
[i49]: https://github.com/tobias-klein/ezra-project/issues/49


## [0.12.1 - 2020-04-04]
This is a bugfix release.

### Enhancements

* Show progress bars for long-running operations (repo config update, module installation, module search). ([#32][i32])
* Optimize chapter headlines (localize headlines according to translation). ([#34][i34])

### Fixes

* Fixed crash after clicking "Find all occurances" for a Strong's number. ([#38][i38])
* Tab management: Fixed regression bug introduced in the last release. ([#37][i37])
* Strong's mouseover info for search results: Fixed regression bug introduced in the last release. ([#39][i39])

[i32]: https://github.com/tobias-klein/ezra-project/issues/32
[i34]: https://github.com/tobias-klein/ezra-project/issues/34
[i37]: https://github.com/tobias-klein/ezra-project/issues/37
[i38]: https://github.com/tobias-klein/ezra-project/issues/38
[i39]: https://github.com/tobias-klein/ezra-project/issues/39

### Enablers

* Add deb package for Linux Mint 19.
* Upgraded Electron from 8.1.1 to 8.2.0.


## [0.12.0 - 2020-03-17]
### Features

* Unlock support ([#18][i18])
* French translation ([#11][i11])

### Enhancements

* Load bible texts directly from SWORD modules (instead from the database) ([#28][i28])
* Enable section titles by default.
* New context toolbar right above text browser. 
  This toolbar now holds all the buttons / menus relevant for working with the text.
  These buttons were formerly shown above the tag list on the left side.
* Option to show/hide the toolbar (on the left side).
  Based on this option Ezra Project can now also be used on tablets in vertical mode where the horizontal space
  is limited.
* Tab search usability: Jump to next occurance by pressing enter.

### Fixes

* Tag checkbox handling: Fixed regression bug that resulted from refactoring in 0.11.0.

### Enablers

* Upgraded Electron from 7.1.1 to 8.1.1.

[i11]: https://github.com/tobias-klein/ezra-project/issues/11
[i18]: https://github.com/tobias-klein/ezra-project/issues/18
[i28]: https://github.com/tobias-klein/ezra-project/issues/28


## [0.11.1 - 2020-01-06]

### Enhancements

* Support on-demand update of repository configuration (in Bible Install Wizard).
* Use lightyellow bg color for tags in bible browser to make them more visible / easier to read.
* Optimized performance of tag list filter function.

### Fixes

* Properly render chapter headlines and book introduction ([#15][i15]).
* Re-initialize Strong's mouseover function after performing tab search.
* Verse context loading: Fixed regression bug that resulted from refactoring in 0.11.0.
* Make it easier to unselect a verse by clicking into an empty area inside the verse list.
* Hide tab searchbox and reset search when reloading translation.

[i15]: https://github.com/tobias-klein/ezra-project/issues/15


## [0.11.0] - 2019-12-23
### Features
* Strong's support ([#10][i10])
  - Strong's transcriptions/original word are displayed as little hint/pop-up above the word when hovering the mouse over the corresponding word.
  - Detailed Strong's information is shown on the bottom left in a new area below the tags list.
  - Strong's based search with link 'Find all occurrances' in info box.
* Dutch translation (Thanks to Tom Lemmens)

### Enhancements
* Possibility to quickly filter translations in bible installation wizard for Strong's feature.
* Lock wizard dialog once installation or uninstallation of translation has started.
* Show a message while migrations are executed on start-up.
* Show chapter headers (can be shown / hidden with existing option 'Show headers').
* Use a loading indicator in tagged verses popup, since tagged verses loading may take some time if there are many verses for one tag.
* Show statistics in title bar of tag list.
* Performance optimization for rendering of tag lists.

### Fixes
* Fixed some locales.
* Added error handling for bible translation install wizard.

### Enablers
* Implemented Strong's parsing in [node-sword-interface](https://github.com/tobias-klein/node-sword-interface).
* Implemented GitHub Continuous Integration - now there's dev packages available for all supported targets (Windows, Linux, macOS) after every push to GitHub.
* Upgraded Electron from 4.2.9 to 7.1.1.

[i10]: https://github.com/tobias-klein/ezra-project/issues/10


## [0.10.0] - 2019-10-15
### Features
* Module search functionality (based on SWORD search function).
* Added translation comparison function. The user can now quickly retrieve the selected verses in all the different available translations (in a popup).
* Added function "Recently used tags" to tags filter menu (filters the tag list to the last 10 used tags).
* Added support for clipboard copy functionality: Now you can copy the currently selected verses to the system clipboard using ctrl + c.
* German translation and handling of language-based chapter/verse separator for verse references.
* Use localized bible book names (based on SWORD translation functionality).

### Enhancements
* Show bible translation id in tab titles.
* Availability of a new release is now indicated in a popup after startup.
* Optimized the needed width for the bible browser navigation pane.

### Fixes
* Avoid duplicates when assigning tags to verses (ensure uniqueness in database + use validation in frontend).
* Also show currently selected verses in verse list mode (relevant for tagged verse lists or module search results).
* Update the tag statistics whenever a tag gets assigned or removed from a verse.
* Fixed the font-size for the tag statistics popup (now like any other dialogue).
* When adding/removing tags, also update the frontend verse box in all other tabs besides the currently opened one.

### Enablers
* Internationalization support (using [I18next][i18next]).
* Implemented packaging support for CentOS 8.

[i18next]: https://www.i18next.com


## [0.9.0] - 2019-08-23
### Features
* Tags can now be shown in a column next to the bible text. This is particularly useful when having a lot of tags, as it gives more overview and makes it easier to focus on the text.
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
* Added module location as another attribute to module information dialog.
* Show number of tagged verses in title of tagged verse list popup.
* Show SWORD version in bible module info dialogue.
* Added Windows build instructions ([#2][i2]).
* Upgraded Electron from 4.2.6 to 4.2.9.

### Fixes
* Corrected bug with Sword paths on Windows and Unix. Now both the user path and the global path gets evaluated correctly both on Windows and on Unix.
* Only disable close button of first tab when it's the last one.
* Remember the last selected bible translation and set that as a default for new tabs.
* Properly rename tab titles containing tags after tag has been renamed.
* Sword backend: Also retrieve empty verses, but only if corresponding bible book is generally existing (applies to John 5:4 for some translations).
* Optimized package size (when packaging remove build artifacts not necessary for production).

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
* Optimized language display in Bible installation wizard: Shows languages in multiple columns.
* Optimized formatting for Bible book selection menu.
* Usability: Verses can now be tagged/untagged also by clicking on the tag label (before this only worked with the checkbox).

### Fixes
* Improved tag loading from database making performance in loading big books (like Psalms) significantly better.


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
