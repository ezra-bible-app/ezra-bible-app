# Ezra Bible App - Changelog
All notable changes to Ezra Bible App are documented in this file.

### [1.0.0 - 2021-04-24]

### Features

* Added menu to adjust font-size for bible text. ([#42][i42])

### Enhancements

* New app logo/icon. ([#214][i214])
* Added icons to improve UI. ([#61][i61])
* Show verse notes in hint/popup when hovering over note indicator and open editor when clicking on it. ([#76][i76])
* Introduced productName field in package.json and add migration script to handle this change. ([#84][i84])
* Improved tab switching and layout performance. ([#99][i99])
* Added possibility to terminate module search. ([#161][i161])
* Integrate information "About Ezra Bible App" in Info Dialog. ([#173][i173])
* Android: Support SWORD internationalization. ([#177][i177])
* Added option to toggle note/tag indicators displayed to the left of the verse references. ([#186][i186])
* Added option to toggle chapter/header navigation. ([#188][i188])
* Added button for loading verse context. ([#189][i189])
* Show verse occurrences chart also for tagged verse list. ([#190][i190])
* Android: Increase size of buttons for closing tabs. ([#191][i191])
* Show header with number of tagged verses above tagged verse list (similar to search result list). ([#192][i192])
* Use module-language based reference separator for rendering verse references. ([#194][i194])
* Improved Tag Statistics - Differentiate most frequently used vs. less frequently used. ([#210][i210])
* Restore previous scroll position of tabs when returning to them. ([#222][i222])
* Save note by CTRL/CMD + Enter. ([#216][i216])

### Fixes

* Fixed bug: Assign last tag button not updated with newly created tag any longer. ([#207][i207])
* Improved perceived loading performance of Tags menu and Change tags menu with a large tag database. ([#209][i209])
* Re-established execution of Cucumber acceptance tests via GitHub Actions. ([#213](i213))

### Enablers

* Change of product name and domain (Ezra Bible App / ezrabibleapp.net). ([#171][i171])
* Added Russian translation. ([#204][i204])
* Added Ukrainian translation. ([#205][i205]) 

[i42]: https://github.com/ezra-project/ezra-project/issues/42
[i61]: https://github.com/ezra-project/ezra-project/issues/61
[i76]: https://github.com/ezra-project/ezra-project/issues/76
[i84]: https://github.com/ezra-project/ezra-project/issues/84
[i99]: https://github.com/ezra-project/ezra-project/issues/99
[i161]: https://github.com/ezra-project/ezra-project/issues/161
[i171]: https://github.com/ezra-project/ezra-project/issues/171
[i173]: https://github.com/ezra-project/ezra-project/issues/173
[i177]: https://github.com/ezra-project/ezra-project/issues/177
[i186]: https://github.com/ezra-project/ezra-project/issues/186
[i188]: https://github.com/ezra-project/ezra-project/issues/188
[i189]: https://github.com/ezra-project/ezra-project/issues/189
[i190]: https://github.com/ezra-project/ezra-project/issues/190
[i191]: https://github.com/ezra-project/ezra-project/issues/191
[i192]: https://github.com/ezra-project/ezra-project/issues/192
[i194]: https://github.com/ezra-project/ezra-project/issues/194
[i210]: https://github.com/ezra-project/ezra-project/issues/210
[i207]: https://github.com/ezra-project/ezra-project/issues/207
[i209]: https://github.com/ezra-project/ezra-project/issues/209
[i213]: https://github.com/ezra-project/ezra-project/issues/213
[i204]: https://github.com/ezra-project/ezra-project/issues/204
[i205]: https://github.com/ezra-project/ezra-project/issues/205
[i214]: https://github.com/ezra-project/ezra-project/issues/214
[i216]: https://github.com/ezra-project/ezra-project/issues/216
[i222]: https://github.com/ezra-project/ezra-project/issues/222

### [0.17.1 - 2021-02-21]

This is a bugfix release only applicable for macOS and Android.

### Fixes

* Fixed bug on Android: Module install assistant times out when retrieving repository languages. ([#184][i184])
* Fixed bug on macOS: Could not re-activate window after closing it once. ([#183][i183])

[i183]: https://github.com/ezra-project/ezra-project/issues/183
[i184]: https://github.com/ezra-project/ezra-project/issues/184

### [0.17.0 - 2021-02-20]

### Features

* Android tablet support. ([#150][i150])
* Android: Add an option to keep the screen awake. ([#160][i160])
* Android: Gracefully handle situation when user denies the app to write on storage. ([#170][i170])
* Android: Support 7" tablet screen size. ([#174][i174])

### Enhancements

* Add option to open verse lists in new tab directly (tagged verse lists, xrefs). ([#176][i176])
* Directly select whole input text when clicking on tag filter. ([#164][i164])
* Integrate information "About Ezra Bible App" in Info Dialog. ([#163][i163])

### Fixes

* Application did not work with non-ascii user directories on Windows. ([#172][i172])
* Fixed bug: Could not install certain modules where the module id is not located in the first line of the *.conf file. ([#179][i179])

### Enablers

* Bundle JS files to further optimize startup performance and enable Cordova integration. ([#97][i97])
* Move all backend code to separate process. ([#158][i158])
* Move to Node.js based settings store. ([#159][i159])
* Android: Stop startup with info message if system webview is too old / not supported. ([#175][i175])

[i97]: https://github.com/ezra-project/ezra-project/issues/97
[i150]: https://github.com/ezra-project/ezra-project/issues/150
[i158]: https://github.com/ezra-project/ezra-project/issues/158
[i159]: https://github.com/ezra-project/ezra-project/issues/159
[i160]: https://github.com/ezra-project/ezra-project/issues/160
[i163]: https://github.com/ezra-project/ezra-project/issues/163
[i164]: https://github.com/ezra-project/ezra-project/issues/164
[i170]: https://github.com/ezra-project/ezra-project/issues/170
[i172]: https://github.com/ezra-project/ezra-project/issues/172
[i174]: https://github.com/ezra-project/ezra-project/issues/174
[i175]: https://github.com/ezra-project/ezra-project/issues/175
[i176]: https://github.com/ezra-project/ezra-project/issues/176
[i178]: https://github.com/ezra-project/ezra-project/issues/178
[i179]: https://github.com/ezra-project/ezra-project/issues/179

## [0.16.0 - 2020-12-20]

### Features

* Added option to augment book chapter navigation with section headers. ([#135][i135])

### Enhancements

* Sort translations in translations menu by module description instead of module code. ([#147][i147])
* Sort entries of compare translations dialog by module description instead of module code. ([#129][i129])
* Added possibility to cancel installation of modules. ([#109][i109])
* Reduced width of compare translations dialogue + Bible translation info box to fit it on smaller screens as well. ([#130][i130])
* Also store newly created tag as the last used tag, so that it is immediately available in the tagging button. ([#131][i131])
* Added filter options to tag assignment drop-down menu. ([#116][i116])
* Added button for fullscreen mode. ([#134][i134])
* Added a button for selecting all module search results for quick tagging. ([#132][i132])
* Improved bible text loading performance.
* Improved startup performance.

### Fixes

* Fixed parsing of section headers of ISV module. ([#146][i146])
* Fixed footnote rendering in ASV module. ([#113][i113])
* Fixed visualization of chapter headers for KJV. ([#141][i141])
* Fixed bug in module search: No progress bar was shown when switching translation on existing search results. ([#133][i133])

### Enablers
* Added Slovakian translation (Thanks to [MartinIIOT](https://github.com/MartinIIOT]). ([#128][i128])
* Added Spanish translation (Thanks to [reyespinosa1996](https://github.com/reyespinosa1996) and [Rodolinux](https://github.com/Rodolinux)). ([#144][i144])
* Added OpenSuse rpm package generation. ([#142][i142])
* Added Fedora 33 package generation. ([#143][i143])
* Added hint about Microsoft Visual C++ 2015 Redistributable dependency when starting up on Windows < 10. ([#136][i136])

[i109]: https://github.com/ezra-project/ezra-project/issues/109
[i113]: https://github.com/ezra-project/ezra-project/issues/113
[i116]: https://github.com/ezra-project/ezra-project/issues/116
[i128]: https://github.com/ezra-project/ezra-project/issues/128
[i129]: https://github.com/ezra-project/ezra-project/issues/129
[i130]: https://github.com/ezra-project/ezra-project/issues/130
[i131]: https://github.com/ezra-project/ezra-project/issues/131
[i132]: https://github.com/ezra-project/ezra-project/issues/132
[i133]: https://github.com/ezra-project/ezra-project/issues/133
[i134]: https://github.com/ezra-project/ezra-project/issues/134
[i135]: https://github.com/ezra-project/ezra-project/issues/135
[i136]: https://github.com/ezra-project/ezra-project/issues/136
[i141]: https://github.com/ezra-project/ezra-project/issues/141
[i142]: https://github.com/ezra-project/ezra-project/issues/142
[i143]: https://github.com/ezra-project/ezra-project/issues/143
[i144]: https://github.com/ezra-project/ezra-project/issues/144


## [0.15.0 - 2020-10-25]

### Features

* Added support for book-level notes. ([#95][i95])

### Enhancements

* Changed layout of options menu to use two columns to enhance support for smaller screens. ([#120][i120])
* Added a button for assigning the last used tag. ([#82][i82])
* Added a header to the book navigation pane to enhance usability. ([#112][i112])
* Added a configuration option to limit height of notes (with scrollbar). ([#114][i114])
* Added a loading indicator to the translation comparison popup. ([#115][i115])
* macOS: Automatic night mode is only used from *macOS Mojave* and later versions. This means that on earlier macOS versions like *High Sierra* or *Yosemite* the manual night mode will be available like on Linux and Windows. ([#124][i124])

### Fixes

* Fixed Crash on Windows related to std::mutex (API locking of node-sword-interface). ([#118][i118])
* Fixed a build issue that prevented Ezra Bible App from working on older macOS 10.x versions. With this issue fixed, it now works from macOS 10.10 (*Yosemite*) and all other subsequent versions. ([#119][i119])
* Fixed a bug where the book selection menu was still responding to clicks even though the buttons were disabled/greyed out. ([#111][i111])
* Fixed a bug where Xref markers do not respond to clicks after tab search has been used. ([#122][i122])
* Fixed a bug where tab search may not have jumped to the right verse when searching within module search results. ([#123][i123])
* Do not allow a new search while a current search is still ongoing (disable search menu button during active search). ([#117][i117])

### Enablers

* Upgraded to latest SWORD version 1.9.0 (SVN Rev. 3820). This is the first version of Ezra Bible App using this latest version of SWORD.

[i82]: https://github.com/ezra-project/ezra-project/issues/82
[i95]: https://github.com/ezra-project/ezra-project/issues/95
[i111]: https://github.com/ezra-project/ezra-project/issues/111
[i112]: https://github.com/ezra-project/ezra-project/issues/112
[i114]: https://github.com/ezra-project/ezra-project/issues/114
[i115]: https://github.com/ezra-project/ezra-project/issues/115
[i117]: https://github.com/ezra-project/ezra-project/issues/117
[i118]: https://github.com/ezra-project/ezra-project/issues/118
[i119]: https://github.com/ezra-project/ezra-project/issues/119
[i120]: https://github.com/ezra-project/ezra-project/issues/120
[i122]: https://github.com/ezra-project/ezra-project/issues/122
[i123]: https://github.com/ezra-project/ezra-project/issues/123
[i124]: https://github.com/ezra-project/ezra-project/issues/124


## [0.14.0 - 2020-08-30]
### Features

* Visualization of Cross References and Footnotes (from SWORD markup). ([#85][i85])
* Dictionary box: Integrate possibility to show Strong's linked dictionary resources. ([#78][i78])
* Added possibility to open verse lists (tagged verses or cross-references) in separate tab. ([#104][i104])
* Windows/Linux: Added fullscreen feature (on F11). ([#98][i98])
* Dictionary install/uninstall assistant. ([#80][i80])

### Enhancements

* Added support for "multiple strong's" connected with one word. ([#103][i103])
* Group entries in display options menu under headlines. ([#87][i87])
* Tagged Verse List popup: Added filter for the verses of the currently opened book. ([#90][i90])
* Use plaintext when copying verses to clipboard. ([#101][i101])

### Fixes

* Strong's search did not return result if Strong's number in text had a/b/c postfixes (like G5179b). ([#79][i79])
* Tag list updates were slow when switching tabs. ([#108][i108])

### Enablers

* Upgraded Electron from 8.3.0 to 9.2.1.

[i78]: https://github.com/ezra-project/ezra-project/issues/78
[i79]: https://github.com/ezra-project/ezra-project/issues/79
[i80]: https://github.com/ezra-project/ezra-project/issues/80
[i85]: https://github.com/ezra-project/ezra-project/issues/85
[i87]: https://github.com/ezra-project/ezra-project/issues/87
[i90]: https://github.com/ezra-project/ezra-project/issues/90
[i98]: https://github.com/ezra-project/ezra-project/issues/98
[i101]: https://github.com/ezra-project/ezra-project/issues/101
[i103]: https://github.com/ezra-project/ezra-project/issues/103
[i104]: https://github.com/ezra-project/ezra-project/issues/104
[i108]: https://github.com/ezra-project/ezra-project/issues/108


## [0.13.2 - 2020-07-08]
This is a bugfix release.

### Fixes

* Tag statistics were not properly updated when assigning tags. ([#100][i100])

[i100]: https://github.com/ezra-project/ezra-project/issues/10


## [0.13.1 - 2020-07-05]
This is a bugfix release.

### Fixes

* Fixed handling of Markdown links in notes. Instead of opening the notes editor now the links are properly opened in the default web browser as one would expect. ([#86][i86])
* Fixed issue in module search - it was case-sensitive by default. Now it is case-insensitive again and the case-sensitive option can be selected by the user. ([#88][i88])
* Fixed issue regarding tag statistics in tag list. These tag statistics were not properly updated in "other tabs" when assigning a tag in a search result list or tagged verse list. ([#91][i91])
* Fixed a layout issue for the tags boxes in the bible browser. This layout issue occurred after all tags where removed from a verse.
* Fixed an issue in the translation install assistant that occurred when filtering on Strong's feature translations.
* Fixed various minor issues related to loading previously selected tabs on startup.

[i86]: https://github.com/ezra-project/ezra-project/issues/86
[i88]: https://github.com/ezra-project/ezra-project/issues/88
[i91]: https://github.com/ezra-project/ezra-project/issues/91


## [0.13.0 - 2020-06-19]
### Features

* Basic note taking functionality. Notes can be added for individual verses using Markdown syntax. ([#45][i45])
* Switchable night-mode / darker color scheme. On macOS this is handled automatically based on the system settings. ([#43][i43])
* Highlight module search results. ([#52][i52])
* Support advanced search options in tab search. ([#56][i56])
* Recently used tags filter in tag selection menu. ([#50][i50])
* New module search option: Search with extended verse boundaries. ([#58][i58])

### Enhancements

* Basic icon. Note that this is just a start and we still need a nicer one than this! ([#26][i26])
* Show license information in module info dialogue. ([#51][i51])
* Enhance width of new tag / rename tag dialogues and input fields. ([#53][i53])
* Cache verse list text data of each tab to improve application startup performance. ([#66][i66])
* Strong's dictionary box: Add dynamically generated link to Blue Letter Bible website. ([#67][i67])
* Use system-specific default fonts. ([#70][i70])
* macOS: Align dialog style to UI guideline (close button on left side, text aligned centrally). ([#72][i72])
* Save window size/position/status and restore on restart. ([#73][i73])
* Improve text loading performance of books. ([#74][i74])

### Fixes

* Properly localize book names in tab titles. ([#41][i41])
* Fixed regression bug related to creation of verse references in case of non-ENGLISH versification. ([#54][i54])
* Fixed tab search (exact phrase search) to properly work with Strong's translations. ([#62][i62])
* Fixed layout issues that occurred with the tabs & menu on a smaller screen. ([#44][i44])
* Fixed verse select behavior in case of individual verse selection (using meta key/ctrl + click). ([#63][i63] and [#81][i81])

### Enablers

* Add deb package for Ubuntu 20.04.
* Upgraded Electron from 8.2.0 to 9.2.1.

[i26]: https://github.com/ezra-project/ezra-project/issues/26
[i41]: https://github.com/ezra-project/ezra-project/issues/41
[i43]: https://github.com/ezra-project/ezra-project/issues/43
[i44]: https://github.com/ezra-project/ezra-project/issues/44
[i45]: https://github.com/ezra-project/ezra-project/issues/45
[i51]: https://github.com/ezra-project/ezra-project/issues/51
[i53]: https://github.com/ezra-project/ezra-project/issues/53
[i50]: https://github.com/ezra-project/ezra-project/issues/50
[i54]: https://github.com/ezra-project/ezra-project/issues/54
[i52]: https://github.com/ezra-project/ezra-project/issues/52
[i56]: https://github.com/ezra-project/ezra-project/issues/56
[i58]: https://github.com/ezra-project/ezra-project/issues/58
[i62]: https://github.com/ezra-project/ezra-project/issues/62
[i63]: https://github.com/ezra-project/ezra-project/issues/63
[i66]: https://github.com/ezra-project/ezra-project/issues/66
[i67]: https://github.com/ezra-project/ezra-project/issues/67
[i70]: https://github.com/ezra-project/ezra-project/issues/70
[i72]: https://github.com/ezra-project/ezra-project/issues/72
[i73]: https://github.com/ezra-project/ezra-project/issues/73
[i74]: https://github.com/ezra-project/ezra-project/issues/74
[i81]: https://github.com/ezra-project/ezra-project/issues/81


## [0.12.2 - 2020-04-20]
This is a bugfix release. This release is mostly relevant for macOS.

### Fixes

* Fixed white screen error on macOS due to dependency issue with icu4c. ([#48][i48])
* Fixed broken English/Hebrew versification mapping. ([#49][i49])

[i48]: https://github.com/ezra-project/ezra-project/issues/48
[i49]: https://github.com/ezra-project/ezra-project/issues/49


## [0.12.1 - 2020-04-04]
This is a bugfix release.

### Enhancements

* Show progress bars for long-running operations (repo config update, module installation, module search). ([#32][i32])
* Optimize chapter headlines (localize headlines according to translation). ([#34][i34])

### Fixes

* Fixed crash after clicking "Find all occurances" for a Strong's number. ([#38][i38])
* Tab management: Fixed regression bug introduced in the last release. ([#37][i37])
* Strong's mouseover info for search results: Fixed regression bug introduced in the last release. ([#39][i39])

[i32]: https://github.com/ezra-project/ezra-project/issues/32
[i34]: https://github.com/ezra-project/ezra-project/issues/34
[i37]: https://github.com/ezra-project/ezra-project/issues/37
[i38]: https://github.com/ezra-project/ezra-project/issues/38
[i39]: https://github.com/ezra-project/ezra-project/issues/39

### Enablers

* Add deb package for Linux Mint 19.
* Upgraded Electron from 8.1.1 to 8.2.0.


## [0.12.0 - 2020-03-17]
### Features

* Unlock support ([#18][i18])
* French translation ([#11][i11])

### Enhancements

* Load bible texts directly from SWORD modules [instead from the database) ([#28][i28])
* Enable section titles by default.
* New context toolbar right above text browser. 
  This toolbar now holds all the buttons / menus relevant for working with the text.
  These buttons were formerly shown above the tag list on the left side.
* Option to show/hide the toolbar (on the left side).
  Based on this option Ezra Bible App can now also be used on tablets in vertical mode where the horizontal space
  is limited.
* Tab search usability: Jump to next occurance by pressing enter.

### Fixes

* Tag checkbox handling: Fixed regression bug that resulted from refactoring in 0.11.0.

### Enablers

* Upgraded Electron from 7.1.1 to 8.1.1.

[i11]: https://github.com/ezra-project/ezra-project/issues/11
[i18]: https://github.com/ezra-project/ezra-project/issues/18
[i28]: https://github.com/ezra-project/ezra-project/issues/28


## [0.11.1 - 2020-01-06]

### Enhancements

* Support on-demand update of repository configuration [in Bible Install Assistant).
* Use lightyellow bg color for tags in bible browser to make them more visible / easier to read.
* Optimized performance of tag list filter function.

### Fixes

* Properly render chapter headlines and book introduction ([#15][i15]).
* Re-initialize Strong's mouseover function after performing tab search.
* Verse context loading: Fixed regression bug that resulted from refactoring in 0.11.0.
* Make it easier to unselect a verse by clicking into an empty area inside the verse list.
* Hide tab searchbox and reset search when reloading translation.

[i15]: https://github.com/ezra-project/ezra-project/issues/15


## [0.11.0] - 2019-12-23
### Features
* Strong's support ([#10][i10])
  - Strong's transcriptions/original word are displayed as little hint/pop-up above the word when hovering the mouse over the corresponding word.
  - Detailed Strong's information is shown on the bottom left in a new area below the tags list.
  - Strong's based search with link 'Find all occurrances' in info box.
* Dutch translation (Thanks to Tom Lemmens)

### Enhancements
* Possibility to quickly filter translations in bible installation assistant for Strong's feature.
* Lock assistant dialog once installation or uninstallation of translation has started.
* Show a message while migrations are executed on start-up.
* Show chapter headers (can be shown / hidden with existing option 'Show headers').
* Use a loading indicator in tagged verses popup, since tagged verses loading may take some time if there are many verses for one tag.
* Show statistics in title bar of tag list.
* Performance optimization for rendering of tag lists.

### Fixes
* Fixed some locales.
* Added error handling for bible translation install assistant.

### Enablers
* Implemented Strong's parsing in [node-sword-interface](https://github.com/ezra-project/node-sword-interface).
* Implemented GitHub Continuous Integration - now there's dev packages available for all supported targets (Windows, Linux, macOS) after every push to GitHub.
* Upgraded Electron from 4.2.9 to 7.1.1.

[i10]: https://github.com/ezra-project/ezra-project/issues/10


## [0.10.0] - 2019-10-15
### Features
* Module search functionality (based on SWORD search function).
* Added translation comparison function. The user can now quickly retrieve the selected verses in all the different available translations [in a popup).
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
* Information about SWORD modules can now be shown before installation when using the bible translation assistant.
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

[i2]: https://github.com/ezra-project/ezra-project/issues/2


## [0.8.1] - 2019-06-21
### Features
* Sync functionality for Sword modules that are already existing locally: On startup any modules not yet used by Ezra Bible App are imported into the database.

### Enhancements
* Link with static Sword library (version 1.8.1), so that dependency to specific Sword package can be avoided.
* Streamlined startup
  * Upgrade the database using migrations (based on Umzug library)
  * Loading indicator for slower systems

### Fixes
* sword.conf file is not created anymore. This "overwrote" the Sword module path in the previous releases. On Windows, modules are found both in the user directory and the "all users" directory. ([#5][i5])
* Support for all languages of ISO-639-1/2/3. This enables the usage of all the available Sword modules.

[i5]: https://github.com/ezra-project/ezra-project/issues/5


## [0.8.0] - 2019-05-30
### Features
* Tabbed user interface
  * Each tab can hold Bible text or tagged verse lists
  * Tabs are saved after every change and loaded when starting Ezra Bible App
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
* Optimized language display in Bible installation assistant: Shows languages in multiple columns.
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
* Improved performance for Bible installation assistant (UI does not block anymore for certain actions)


## [0.6.0] - 2019-02-03
This is the initial public release of Ezra Bible App for the Linux desktop.

### Features
* Add/remove Bible translations from SWORD repositories
* Browse Bible books
* Create tags and assign them to verses
* Show lists of tagged verses
