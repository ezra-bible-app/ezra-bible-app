# Ezra Bible App - Changelog
All notable changes to Ezra Bible App are documented in this file.

## [1.18.0 - 2025-12-20]

### Enhancements

* Make font family of user content (tags / notes) customizable. ([#1204][i1204])
* Show recently used passages in Bible book menu. ([#1224][i1224])
* Configurable order of verse reference and verse content in copy/pasted texts. ([#1218][i1218])
* Chrome-style tab navigation for mobile app. ([#1242][i1242])
* Show module id, repository name and version info in module update table. ([#1239][i1239])

### Fixes

* Tags in tag selection menu are not sorted correctly after tag title is renamed. ([#1251][i1251])
* Tag rename dialogue responds to enter key even if save button is disabled. ([#1252][i1252])
* New menu button layout may not fit horizontally on mobile screens. ([#1240][i1240])
* Empty tabs appearing after a Dropbox sync at startup. ([#1241][i1241])
* Word boundary search option not applied correctly by search result highlighting. ([#1244][i1244])
* Module search not responding to enter button on mobile. ([#1245][i1245])
* Scroll position of active tab not correctly persisted. ([#1248][i1248])
* Swipe actions are not working right after startup in case of multiple tabs. ([#1250][i1250])
* Unable to do "Configure translations". ([#1269][i1269])

### Enablers

* Debian 13 package. ([#1257][i1257])
* Fix Windows build. ([#1274][i1274])
* Signed installer for Windows. ([#40][i40])

[i40]: https://github.com/ezra-bible-app/ezra-bible-app/issues/40
[i1204]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1204
[i1218]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1218
[i1224]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1224
[i1239]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1239
[i1240]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1240
[i1241]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1241
[i1242]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1242
[i1244]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1244
[i1245]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1245
[i1248]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1248
[i1250]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1250
[i1251]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1251
[i1252]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1252
[i1257]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1257
[i1269]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1269
[i1274]: https://github.com/ezra-bible-app/ezra-bible-app/pull/1274

## [1.17.0 - 2025-04-19]

### Features

* Add support for tag-specific notes. ([#1200][i1200])

### Enhancements

* Add a context menu button that allows opening a verse in a new tab. ([#1189][i1189])
* Include notes in document export of tagged verse list. ([#1219][i1219])
* Add fullscreen option for note editor. ([#1206][i1206])
* Remember commentary collapse status by commentary module. ([#1185][i1185])
* Add module search option to filter on word boundary. ([#1214][i1214])
* Hide book/tag overview in tagged verse list if the verse list only covers one book. ([#1205][i1205])

### Fixes

* Filter out style/script sections in notes to avoid code injection. ([#1207][i1207])
* Tag distribution matrix not updating when changing tag selections of tagged verse list. ([#1212][i1212])
* Button for second Bible translation cut off in portrait mode on tablets. ([#1215][i1215])
* Closing tab during module search causes JavaScript errors. ([#1216][i1216])
* Search function unreliable. ([#1210][i1210])
* Auto-close tab when tag is deleted. ([#1222][i1222])

### Enablers

* Replace node-prune with clean-modules. ([#1188][i1188])

[i1185]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1185
[i1188]: https://github.com/ezra-bible-app/ezra-bible-app/pull/1188
[i1189]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1189
[i1200]: https://github.com/ezra-bible-app/ezra-bible-app/pull/1200
[i1205]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1205
[i1206]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1206
[i1207]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1207
[i1210]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1210
[i1212]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1212
[i1214]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1214
[i1215]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1215
[i1216]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1216
[i1219]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1219
[i1222]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1222

## [1.16.3 - 2025-02-22]

### Fixes

* Tag statistics not updating when switching tabs. ([#1195][i1195])
* Searching Strong's occurrences does not work with translations that pad the Strongs number (like deu1912eb). ([#1196][i1196])
* Searching Strong's occurrences does not work if Strong's entry comes from second Bible translation. ([#1197][i1197])
* Export of book-based docx does not work anymore. ([#1201][i1201])

[i1195]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1195
[i1196]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1196
[i1197]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1197
[i1201]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1201

## [1.16.2 - 2025-01-12]

### Fixes

* Text selection of verses does not work anymore. ([#1187][i1187])
* Copying verses from translation comparison panel does not work anymore. ([#1191][i1191])

[i1187]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1187
[i1191]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1191

## [1.16.1 - 2025-01-04]

### Fixes

* Parallel translation does not appear in x-refs tab. ([#1177][i1177])
* When loading context verses in current tab, existing verses from other tabs are removed. ([#1178][i1178])
* Too many verses loaded when loading context verses. ([#1179][i1179])
* Copy/paste only pulls verse numbers. ([#1180][i1180])
* Verses are not selected correctly by tab search functionality. ([#1181][i1181])
* Versification mapping not correctly working for parallel translations in "full book mode". ([#1183][i1183])

[i1177]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1177
[i1178]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1178
[i1179]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1179
[i1180]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1180
[i1181]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1181
[i1183]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1183

## [1.16.0 - 2024-12-30]

### Features

* Add support for dictionaries like Nave's, Thompson Chain References, Vine. ([#1142][i1142])
* Bible browser: Parallel translation mode. ([#30][i30])

### Enhancements

* Make verse references in commentary side panel clickable / navigable. ([#1044][i1044])
* Apply font/typeface settings to all module text content. ([#1132][i1132])
* Make individual commentary sections collapsible. ([#1141][i1141])
* Freeze mouseover on dictionary entries when clicking individual word. ([#1143][i1143])

### Fixes

* Issue with wrapping text in Bible translation selection menu. ([#1125][i1125])
* Module Assistant - Issue with locked module selection. ([#1129][i1129])
* Scroll position of source tab not saved when opening tagged verse list in new tab. ([#1131][i1131])
* Tab scroll position of previous tab is not restored correctly when closing tab. ([#1133][i1133])
* Selected verse and corresponding commentary entry gets de-selected when switching translation. ([#1134][i1134])
* Verse selection fails if the verse is the same as the previous selected one. ([#1135][i1135])
* RTL translations are not rendered right to left in compare translations panel. ([#1136][i1136])
* Tag cannot be re-created after being deleted. ([#1137][i1137])
* Swipe actions on Android make chapter changes slow over time. ([#1138][i1138])
* Copy button not fitting small phone screens. ([#1139][i1139])
* macOS: Updates not working for modules in ~/Library/Application Support/Sword. ([#1140][i1140])
* Update Electron to version 32.2.3 to improve note taking under Wayland. ([#1147][i1147])
* Tagged Verse List - Verse Count and Select All Verses button are added again when changing Bible translation. ([#1160][i1160])
* Crashes when viewing commentaries. ([#1162][i1162])
* Android version check via user agent not reliable on GrapheneOS. ([#1167][i1167])

### Enablers

* Add package for CentOS 9. ([#1148][i1148])
* Add package for OpenSuse Leap 15.5 (to replace 15.2). ([#1149][i1149])
* Add package for OpenSuse Leap 15.6. ([#1151][i1151])
* Upgrade Android base technology:
  - Upgrade from Cordova 7 to Cordova 12
  - Upgrade from Cordova Android 6.4 to [13.0](https://cordova.apache.org/announcements/2024/05/23/cordova-android-13.0.0.html)
  - Upgrade nodejs-mobile-cordova from the last version that was maintained by Janea Systems to a [new version](https://github.com/okhiroyuki/nodejs-mobile-cordova) based on a [community fork of nodejs-mobile](https://github.com/nodejs-mobile/nodejs-mobile).
  - Make changes in the Build environment for ezra-bible-app-cordova:
    - Move to a new Java version (from 8 to 17)
    - Move to a new Gradle version (from 6.7.1 to 7.6)
    - Move to a new Android NDK (from 21.3 to 27.2)

[i30]: https://github.com/ezra-bible-app/ezra-bible-app/issues/30
[i1044]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1044
[i1125]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1125
[i1129]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1129
[i1131]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1131
[i1132]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1132
[i1133]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1133
[i1134]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1134
[i1135]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1135
[i1136]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1136
[i1137]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1137
[i1138]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1138
[i1139]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1139
[i1140]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1140
[i1141]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1141
[i1142]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1142
[i1143]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1143
[i1147]: https://github.com/ezra-bible-app/ezra-bible-app/pull/1147
[i1148]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1148
[i1149]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1149
[i1151]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1151
[i1160]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1160
[i1162]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1162
[i1167]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1167

## [1.15.0 - 2024-09-21]

### Enhancements

* Make Darkmode configurable on macOS. ([#1042][i1042])
* Navigate chapters with left/right keys on Desktop. ([#1057][i1057])
* Add quick link "All tags" in tag list menu to navigate back to All tags after selecting tag group. ([#1072][i1072])
* Option to show Strong's #'s inline with text and/or search results. ([#1087][i1087])
* Save verse selection per tab on desktop. ([#1095][i1095])
* Enable text selection for verses that are selected. ([#1104][i1104])
* Copy current selection (text) or currently selected verse(s) via copy button. ([#1102][i1102])

### Fixes

* Dropbox feedback: Change Dropbox access level to app folder access. ([#1090][i1090])
* Cannot automatically recover from database corruption. ([#1096][i1096])
* Scroll position of source tab not saved when "finding all occurrences". ([#1101][i1101])
* Languages with region code not shown correctly in Language selection. ([#1109][i1109])

[i1042]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1042
[i1057]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1057
[i1072]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1072
[i1078]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1078
[i1087]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1087
[i1090]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1090
[i1095]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1095
[i1096]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1096
[i1101]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1101
[i1102]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1102
[i1104]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1104
[i1109]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1109

## [1.14.1 - 2024-08-03]

### Fixes

* Dropbox feedback: OAuth authorization flow processed inside web view. ([#1079][i1079])
* Search results for Strongs Hebrew #'s lack highlight. ([#1085][i1085])
* Translations with leading zeros in Strong's #s (eg. H07225) cause the function "Find all occurances" to always return zero results. ([#1086][i1086])

[i1079]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1079
[i1085]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1085
[i1086]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1086

## [1.14.0 - 2024-06-30]

### Enhancements

* Add support for reading modules from /sdcard/Documents/sword on Android. ([NSI#51][nsi51])
* Introduce option for configuring typeface/font of the Bible text. ([#1007][i1007])
* Add button for copying individual commentary sections to the clipboard. ([#1041][i1041])

### Fixes

* Tag Statistics Panel - Column Header 'Tag' is not localized. ([#1012][i1012])
* Bible commentaries and dictionaries do not render paragraphs correctly. ([#1016][i1016])
* Dictionary side panel stops working if any SWORD module is uninstalled. ([#1045][i1045])
* Blocking JavaScript errors after turning off error reporting option. ([#1048][i1048])
* Showing search results in a popup generates an empty new tab if triggered via Dictionary Panel strongs search. ([#1056][i1056])

### Enablers

* Add package for Ubuntu 24.04. ([#1051][i1051])

[nsi51]: https://github.com/ezra-bible-app/node-sword-interface/issues/51
[i1007]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1007
[i1012]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1012
[i1016]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1016
[i1041]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1041
[i1045]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1045
[i1048]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1048
[i1051]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1051
[i1056]: https://github.com/ezra-bible-app/ezra-bible-app/issues/1056

## [1.13.0 - 2024-01-20]

### Enhancements

* Turn word website in app info dialog into translatable term. ([#956][i956])
* Add support for selecting verses based on pressing Shift key. ([#957][i957])
* Add a button for selecting all verses of a tagged verse list. ([#958][i958])
* Add a short cut for selecting all verses in the search results or a tagged verse list (CTRL + A). ([#959][i959])
* Copy verses to clipboard including html formatting. ([#962][i962])
* Dictionary use without keyboard. ([#912][i912])
* Put transChange meta data in html title attribute to make it readable. ([#972][i972])
* Adjust height of chapter selection dialog on large mobiles. ([#856][i856])
* Copy "Comparison Window" to Clipboard. ([#537][i537])
* Cancel note editing when pressing Escape. ([#978][i978])
* Make new release checking configurable. ([#988][i988])
* Make Sentry error reporting configurable. ([#989][i989])
* Add dialog that asks for confirming privacy options at first start of the app. ([#991][i991])
* Add ability to switch tag group within tag statistics panel. ([#995][i995])

### Fixes

* Header section of tagged verse list and search results does not adjust when changing the font size. ([#960][i960])
* Tag distribution matrix not correctly shown after reload/startup when on second/third tab. ([#961][i961])
* Verse context action menu/button is missing tooltip / title. ([#963][i963])
* Greek Strong's parsing broken with StrongsGreek version 2.0. ([NSI #49][nsi49])
* Android: Tag button stays active after unassigning tag from verse. ([#975][i975])
* Verse references are sometimes not parsed correctly when tagging verses. ([#979][i979])
* Verses not separated correctly with copy to clipboard functionality. ([#983][i983])
* Saving current tab configuration not working on Android exit, but only on pause. ([#997][i997])

### Enablers
* Add Slovenian locale, thanks to Marjan Šavli. ([#1011][i1011])

[i537]: https://github.com/ezra-bible-app/ezra-bible-app/issues/537
[i856]: https://github.com/ezra-bible-app/ezra-bible-app/issues/856
[i912]: https://github.com/ezra-bible-app/ezra-bible-app/issues/912
[i956]: https://github.com/ezra-bible-app/ezra-bible-app/issues/956
[i957]: https://github.com/ezra-bible-app/ezra-bible-app/issues/957
[i958]: https://github.com/ezra-bible-app/ezra-bible-app/issues/958
[i959]: https://github.com/ezra-bible-app/ezra-bible-app/issues/959
[i960]: https://github.com/ezra-bible-app/ezra-bible-app/issues/960
[i961]: https://github.com/ezra-bible-app/ezra-bible-app/issues/961
[i962]: https://github.com/ezra-bible-app/ezra-bible-app/issues/962
[i963]: https://github.com/ezra-bible-app/ezra-bible-app/issues/963
[i972]: https://github.com/ezra-bible-app/ezra-bible-app/issues/972
[i975]: https://github.com/ezra-bible-app/ezra-bible-app/issues/975
[i978]: https://github.com/ezra-bible-app/ezra-bible-app/issues/978
[i979]: https://github.com/ezra-bible-app/ezra-bible-app/issues/979
[i983]: https://github.com/ezra-bible-app/ezra-bible-app/issues/983
[i988]: https://github.com/ezra-bible-app/ezra-bible-app/issues/988
[i989]: https://github.com/ezra-bible-app/ezra-bible-app/issues/989
[i991]: https://github.com/ezra-bible-app/ezra-bible-app/issues/991
[i995]: https://github.com/ezra-bible-app/ezra-bible-app/issues/995
[i997]: https://github.com/ezra-bible-app/ezra-bible-app/issues/997
[i1011]: https://github.com/ezra-bible-app/ezra-bible-app/pull/1011
[nsi49]: https://github.com/ezra-bible-app/node-sword-interface/issues/49

## [1.12.0 - 2023-11-18]

### Enhancements

* Force horizontal display of verse notes in Portrait mode. ([#915][i915])
* Scroll back to same verse after changing translations. ([#916][i916])
* Add option that synchronizes the font size of the side panel with the font size used for the Bible text. ([#921][i921])
* Automatically open module install assistant when no SWORD modules are installed yet. ([#885][i885])

### Fixes

* Dynamically determine reference separator when mapping absolute verse number. ([#928][i928])
* Font-size settings are not applied in popup dialogs. ([#922][i922])
* Wrong text direction for Hebrew Bibles. ([#938][i938])

### Enablers

* Add package for Debian 12. ([#929][i929])

[i885]: https://github.com/ezra-bible-app/ezra-bible-app/issues/885
[i915]: https://github.com/ezra-bible-app/ezra-bible-app/issues/915
[i916]: https://github.com/ezra-bible-app/ezra-bible-app/issues/916
[i921]: https://github.com/ezra-bible-app/ezra-bible-app/issues/921
[i922]: https://github.com/ezra-bible-app/ezra-bible-app/issues/922
[i928]: https://github.com/ezra-bible-app/ezra-bible-app/issues/928
[i929]: https://github.com/ezra-bible-app/ezra-bible-app/issues/929
[i938]: https://github.com/ezra-bible-app/ezra-bible-app/issues/938

## [1.11.0 - 2023-04-23]

### Features

* Add support for Bible commentary modules. ([#886][i886])

### Enhancements

* Show SWORD module attribute SwordVersionDate as last update in module info. ([#897][i897])
* Merge module description and module details tabs in app info dialog. ([#893][i893])
* Update module dialog should be modal like the install translation/dictionary dialog. ([#882][i882])
* Add info button to show dictionary module info. ([#895][i895])
* Show source repository in module info dialog. ([#901][i901])

### Fixes

* Search terms are not highlighted if search term is found within text that quotes Jesus. ([#889][i889])
* Module search is hanging if search starts or ends with whitespace. ([#888][i888])
* Module assistant and module update dialog does not always fit the screen on Android. ([#883][i883])

### Enablers

[i882]: https://github.com/ezra-bible-app/ezra-bible-app/issues/882
[i883]: https://github.com/ezra-bible-app/ezra-bible-app/issues/883
[i886]: https://github.com/ezra-bible-app/ezra-bible-app/issues/886
[i888]: https://github.com/ezra-bible-app/ezra-bible-app/issues/888
[i889]: https://github.com/ezra-bible-app/ezra-bible-app/issues/889
[i893]: https://github.com/ezra-bible-app/ezra-bible-app/issues/893
[i895]: https://github.com/ezra-bible-app/ezra-bible-app/issues/895
[i897]: https://github.com/ezra-bible-app/ezra-bible-app/issues/897
[i901]: https://github.com/ezra-bible-app/ezra-bible-app/issues/901

## [1.10.0 - 2023-02-25]

### Enhancements

* Add option to show search results in popup. ([#853][i853])
* Show persecution warning message also for update module dialog. ([#849][i849])
* Hide tag indicators on Android and show large note indicator below verse references on all device classes. ([#871][i871])

### Fixes

* Font size setting not used in popup dialogs. ([#866][i866])
* Module search menu does not respond to Enter button on Android. ([#852][i852])
* App info dialog keeps cache of SWORD module even after module update. ([#869][i869])
* Module search: Do not consider footnotes, headings and other markup. ([#851][i851])

### Enablers

* Remove libicu dependency on Linux. ([#878][i878])

[i849]: https://github.com/ezra-bible-app/ezra-bible-app/issues/849
[i851]: https://github.com/ezra-bible-app/ezra-bible-app/issues/851
[i852]: https://github.com/ezra-bible-app/ezra-bible-app/issues/852
[i853]: https://github.com/ezra-bible-app/ezra-bible-app/issues/853
[i866]: https://github.com/ezra-bible-app/ezra-bible-app/issues/866
[i869]: https://github.com/ezra-bible-app/ezra-bible-app/issues/869
[i871]: https://github.com/ezra-bible-app/ezra-bible-app/issues/871
[i878]: https://github.com/ezra-bible-app/ezra-bible-app/issues/878

## [1.9.0 - 2022-12-16]

### Features

* Module update functionality. ([#31][i31])
* Tagged verse list - show number of occurrences per Bible book and per tag. ([#527][i527])
* Add option to render red letter words. ([#817][i817])
* Add option to render paragraphs. ([#771][i771])

### Enhancements

* Comparison function: Don't start comparison with one translation. ([#749][i749])
* Show note indicator icons below verse reference on mobile. ([#795][i795])
* Highlight tag after assigning it to a verse. ([#796][i796])
* Add existing tags to tag group dialog - add possibility to filter tag list. ([#801][i801])
* Save selected tag group when closing app and load it when starting up. ([#679][i679])
* Limit verse text column width. ([#815][i815])
* Make tags in tag statistics panel clickable. ([#822][i822])
* Align side panel buttons centrally on mobile. ([#823][i823])
* Android: Automatically activate dictionary for selected verse when panel is enabled. ([#825][i825])
* Add clear/delete button to text fields. ([#833][i833])

### Fixes

* Tag selection menu not correctly filtering recently used tags when re-opened. ([#790][i790])
* Message for updating internet repo data wrapping in progress bar. ([#551][i551])
* Option to adjust tag and notes text size along with bible text not stored across sessions. ([#797][i797])
* Delayed/faulty startup when Dropbox link configured and internet down. ([#800][i800])
* Tag statistics not loading content when book is opened from cache. ([#806][i806])
* Text in book loading mode option cut off with longer texts (other languages than English). ([#808][i808])
* Tag Statistics panel header not correctly updated when changing locale. ([#810][i810])
* Cross reference verse list sorted incorrectly. ([#818][i818])
* First opening of tag list on mobile takes longer. ([#821][i821])
* Android: Panel buttons keep active (highlighted) even if panel is not shown. ([#824][i824])
* List of translations (SWORD modules) wrongly sorted on mobile. ([#826][i826])
* Android: Dialog close icons too small / not mobile-friendly. ([#830][i830])

### Enablers

* Packaging support for Fedora 37. ([#819][i819])

[i31]: https://github.com/ezra-bible-app/ezra-bible-app/issues/31
[i527]: https://github.com/ezra-bible-app/ezra-bible-app/issues/527
[i551]: https://github.com/ezra-bible-app/ezra-bible-app/issues/551
[i679]: https://github.com/ezra-bible-app/ezra-bible-app/issues/679
[i749]: https://github.com/ezra-bible-app/ezra-bible-app/issues/749
[i771]: https://github.com/ezra-bible-app/ezra-bible-app/issues/771
[i790]: https://github.com/ezra-bible-app/ezra-bible-app/issues/790
[i795]: https://github.com/ezra-bible-app/ezra-bible-app/issues/795
[i796]: https://github.com/ezra-bible-app/ezra-bible-app/issues/796
[i797]: https://github.com/ezra-bible-app/ezra-bible-app/issues/797
[i800]: https://github.com/ezra-bible-app/ezra-bible-app/issues/800
[i801]: https://github.com/ezra-bible-app/ezra-bible-app/issues/801
[i806]: https://github.com/ezra-bible-app/ezra-bible-app/issues/806
[i808]: https://github.com/ezra-bible-app/ezra-bible-app/issues/808
[i810]: https://github.com/ezra-bible-app/ezra-bible-app/issues/810
[i815]: https://github.com/ezra-bible-app/ezra-bible-app/issues/815
[i817]: https://github.com/ezra-bible-app/ezra-bible-app/issues/817
[i818]: https://github.com/ezra-bible-app/ezra-bible-app/issues/818
[i819]: https://github.com/ezra-bible-app/ezra-bible-app/issues/819
[i821]: https://github.com/ezra-bible-app/ezra-bible-app/issues/821
[i822]: https://github.com/ezra-bible-app/ezra-bible-app/issues/822
[i823]: https://github.com/ezra-bible-app/ezra-bible-app/issues/823
[i824]: https://github.com/ezra-bible-app/ezra-bible-app/issues/824
[i825]: https://github.com/ezra-bible-app/ezra-bible-app/issues/825
[i826]: https://github.com/ezra-bible-app/ezra-bible-app/issues/826
[i830]: https://github.com/ezra-bible-app/ezra-bible-app/issues/830
[i833]: https://github.com/ezra-bible-app/ezra-bible-app/issues/833

## [1.8.0 - 2022-10-21]

### Features

* Dropbox Sync functionality. ([#753][i753])

### Enhancements

* Show chapter selection dialog when clicking on the text "chapter" in the chapter navigation. ([#744][i744])
* Clicking a verse a second time should remove it from the selection. ([#702][i702])
* Verse context menu: Add option to delete verse note. ([#743][i743])

### Fixes

* Headers in navigation are not shown correctly for some modules (like engNET2016eb). ([#776][i776])
* Lower button bar cut off on some Android devices (< 11). ([#769][i769])
* Issue with KJVA and verse comparison. ([#734][i734])
* Connectivity issue not detected when installing modules, installation finishes without error message. ([#751][i751])
* New tag is not getting added to currently selected tag group. ([#742][i742])
* Android: Last word/phrase of editor text cut off when saving note. ([#741][i741])
* Assign last tag button still showing tag after the last tag was deleted. ([#740][i740])
* Verse context menu still opening when button is disabled. ([#739][i739])
* Newly assigned tag labels disappeared in text after renaming a tag. ([#738][i738])
* Tag statistics not correctly updated on startup when loading from previous session. ([#785][i785])

### Enablers

* Support Fedora 35/36/37. ([#765][i765])

[i776]: https://github.com/ezra-bible-app/ezra-bible-app/issues/776
[i769]: https://github.com/ezra-bible-app/ezra-bible-app/issues/769
[i734]: https://github.com/ezra-bible-app/ezra-bible-app/issues/734
[i753]: https://github.com/ezra-bible-app/ezra-bible-app/issues/753
[i765]: https://github.com/ezra-bible-app/ezra-bible-app/issues/765
[i744]: https://github.com/ezra-bible-app/ezra-bible-app/issues/744
[i751]: https://github.com/ezra-bible-app/ezra-bible-app/issues/751
[i702]: https://github.com/ezra-bible-app/ezra-bible-app/issues/702
[i743]: https://github.com/ezra-bible-app/ezra-bible-app/issues/743
[i742]: https://github.com/ezra-bible-app/ezra-bible-app/issues/742
[i741]: https://github.com/ezra-bible-app/ezra-bible-app/issues/741
[i740]: https://github.com/ezra-bible-app/ezra-bible-app/issues/740
[i739]: https://github.com/ezra-bible-app/ezra-bible-app/issues/739
[i738]: https://github.com/ezra-bible-app/ezra-bible-app/issues/738
[i785]: https://github.com/ezra-bible-app/ezra-bible-app/issues/785

## [1.7.1 - 2022-08-28]

This is a bugfix release primarily addressing issues on Android.

## [1.7.0 - 2022-08-21]

This release adds support for Android mobile devices.

### Enhancements

* Exclude currently opened Bible translation in compare translations function. ([#681][i681])
* Only activate mouseover/longpress dictionary look-up when dictionary panel is open. ([#680][i680])
* Navigate chapters by swiping left/right. ([#730][i730])

### Fixes

* Fixed bug: Tag title was getting erased when adding a tag to tag group. ([#688][i688])
* Fixed storage/permission issues on Android 11. ([#704][i704])
* Fixed bug: Tag group filter was not considered when updating visible tags of a verse after assignment changes. ([#678][i678])

### Enablers

* Optimized layout & style for mobile screens. ([#669][i669])
* Added support for Ubuntu 22.04. ([#684][i684])

[i669]: https://github.com/ezra-bible-app/ezra-bible-app/issues/669
[i678]: https://github.com/ezra-bible-app/ezra-bible-app/issues/678
[i680]: https://github.com/ezra-bible-app/ezra-bible-app/issues/680
[i681]: https://github.com/ezra-bible-app/ezra-bible-app/issues/681
[i684]: https://github.com/ezra-bible-app/ezra-bible-app/issues/684
[i688]: https://github.com/ezra-bible-app/ezra-bible-app/issues/688
[i704]: https://github.com/ezra-bible-app/ezra-bible-app/issues/704
[i730]: https://github.com/ezra-bible-app/ezra-bible-app/issues/730

## [1.6.0 - 2022-04-23]

### Features

* Tags can now be categorized / grouped in tag groups. ([#641][i641])

### Enhancements

* Chapter navigation: Highlight chapters that contain tagged verses. ([#650][i650])
* Select complete existing filter text when clicking into tag list filter input field. ([#599][i599])
* Adapt dictionary info box help text for Android / touch screen. ([#623][i623])
* Add links to the Ezra Bible App website / repository. ([#627][i627])

### Fixes

* Fixed performance issues when loading large books. ([#659][i659])
* Fixed bug: Tab title was getting too long when selecting many tags. ([#648][i648])
* Fixed bug: File name of exported file was getting too long when selecting many tags. ([#649][i649])
* Fixed bug: Inaccurate search results when limiting search scope. ([#666][i666])

### Enablers

* Upgraded Electron to version 17.1.0. ([#638][i638])

[i599]: https://github.com/ezra-bible-app/ezra-bible-app/issues/599
[i623]: https://github.com/ezra-bible-app/ezra-bible-app/issues/623
[i627]: https://github.com/ezra-bible-app/ezra-bible-app/issues/627
[i638]: https://github.com/ezra-bible-app/ezra-bible-app/issues/638
[i641]: https://github.com/ezra-bible-app/ezra-bible-app/pull/641
[i648]: https://github.com/ezra-bible-app/ezra-bible-app/issues/648
[i649]: https://github.com/ezra-bible-app/ezra-bible-app/issues/649
[i650]: https://github.com/ezra-bible-app/ezra-bible-app/issues/650
[i659]: https://github.com/ezra-bible-app/ezra-bible-app/issues/659
[i666]: https://github.com/ezra-bible-app/ezra-bible-app/issues/666

## [1.5.0 - 2022-02-26]

### Features

* CSV export of all user data (tags, notes). ([#508][i508])
* Support deuterocanonical / apocryphal books. ([#612][i612])

### Enhancements

* Render the transChange element as italic. ([#603][i603])
* Easily choose many tags at the same time. ([#528][i528])
* Move compare translation function to tool panel. ([#581][i581])
* Move tag statistics to tool panel. ([#594][i594])
* Move New Tag button to tag list panel. ([#572][i572])
* Move verse-related action buttons to separate drop down menu. ([#595][i595])
* Chapter navigation: Load section headers for complete book upfront. ([#340][i340])

### Fixes

* Fixed bug: macOS: Menu not localized. ([#353][i353])
* Fixed bug: Strong's dictionaries not automatically available after manual installation. ([#610][i610])
* Fixed bug: Verse with multiple tags showing multiple times in tagged verse list. ([#618][i618])

[i508]: https://github.com/ezra-bible-app/ezra-bible-app/issues/508
[i612]: https://github.com/ezra-bible-app/ezra-bible-app/issues/612
[i603]: https://github.com/ezra-bible-app/ezra-bible-app/issues/603
[i528]: https://github.com/ezra-bible-app/ezra-bible-app/issues/528
[i581]: https://github.com/ezra-bible-app/ezra-bible-app/issues/581
[i594]: https://github.com/ezra-bible-app/ezra-bible-app/issues/594
[i572]: https://github.com/ezra-bible-app/ezra-bible-app/issues/572
[i595]: https://github.com/ezra-bible-app/ezra-bible-app/issues/595
[i340]: https://github.com/ezra-bible-app/ezra-bible-app/issues/340
[i353]: https://github.com/ezra-bible-app/ezra-bible-app/issues/353
[i610]: https://github.com/ezra-bible-app/ezra-bible-app/issues/610
[i618]: https://github.com/ezra-bible-app/ezra-bible-app/issues/618

## [1.4.2 - 2021-12-28]

Bugfix release for Android.

### Fixes

* Fixed bug: Repositories in Module Assistant were not initialized correctly even though data was available. ([#587][i587])
* Fixed bug: Links in dictionary panel were not showing underline with mouseover anymore. ([#588][i588])
* Fixed bug on Android: Screen keyboard on 8" tablet in portrait mode unintentionally triggers landscape layout. ([#589][i589])
* Fixed bug on Android: Unhandled SQLITE_READONLY issue. ([#596][i596])

[i587]: https://github.com/ezra-bible-app/ezra-bible-app/issues/587
[i588]: https://github.com/ezra-bible-app/ezra-bible-app/issues/588
[i589]: https://github.com/ezra-bible-app/ezra-bible-app/issues/589
[i596]: https://github.com/ezra-bible-app/ezra-bible-app/issues/596

## [1.4.1 - 2021-12-21]

Bugfix release for Windows. The GitHub Actions build for Windows was broken in 1.4.0.

## [1.4.0 - 2021-12-18]

### Enhancements

* Fullscreen mode with hidden menu and wheel navigation as verse context menu. ([#454][i454])
* Made sidebar (tag view) and dictionary switchable by side buttons. ([#346][i346])
* Use only one toolbox window for tag list and dictionary. ([#542][i542])
* Added search scope option for module search functionality. ([#518][i518])
* Added separate button to add note to the currently selected verse. ([#253][i253])
* Added copy to clipboard button. ([#254][i254])
* Optimized design of tag list panel. ([#475][i475] and [#532][i532])
* When opening the notes editor put the cursor at the end of existing text. ([#544][i544])
* Add the SWORD path to the list of versions and paths in the App info dialog. ([#548][i548])

### Fixes

* Fixed bug: Repository update failed already if only one repository was offline. ([#395][i395])
* Fixed bug: It was not possible to press emoji button in notes with large amount of text. ([#504][i504])
* Fixed bug: Cancelling module installation did not work on Android. ([#394][i394])
* Fixed bug: Bible book locale was not rendered in case language code was hyphenated. ([#539](i539))
* Fixed bug: Raised SWORD InstallMgr default timeout from 10s to 20s to fix issues with slow internet connections. ([#157][i157])
* Fixed bug: The screen was cut off on Android in landscape mode. ([#545][i545])
* Significant performance improvement for large tag lists. ([#543][i543])

### Enablers

* Android: Adjusted target API level to 30 / Android 11. ([#509][i509])
* Refactoring: Use observer pattern for events currently handled by AppController. ([#282](i282))
* Android: Use new storage path /sdcard/Documents. ([#468][i468])
* Android: Save last used Android version when app is closing. ([#546][i546])

[i282]: https://github.com/ezra-bible-app/ezra-bible-app/issues/282
[i394]: https://github.com/ezra-bible-app/ezra-bible-app/issues/394
[i395]: https://github.com/ezra-bible-app/ezra-bible-app/issues/395
[i504]: https://github.com/ezra-bible-app/ezra-bible-app/issues/504
[i509]: https://github.com/ezra-bible-app/ezra-bible-app/issues/509
[i518]: https://github.com/ezra-bible-app/ezra-bible-app/issues/518
[i539]: https://github.com/ezra-bible-app/ezra-bible-app/issues/539
[i454]: https://github.com/ezra-bible-app/ezra-bible-app/pull/454
[i253]: https://github.com/ezra-bible-app/ezra-bible-app/issues/253
[i254]: https://github.com/ezra-bible-app/ezra-bible-app/issues/254
[i157]: https://github.com/ezra-bible-app/ezra-bible-app/issues/157
[i475]: https://github.com/ezra-bible-app/ezra-bible-app/issues/475
[i532]: https://github.com/ezra-bible-app/ezra-bible-app/issues/532
[i544]: https://github.com/ezra-bible-app/ezra-bible-app/issues/544
[i545]: https://github.com/ezra-bible-app/ezra-bible-app/issues/545
[i468]: https://github.com/ezra-bible-app/ezra-bible-app/issues/468
[i548]: https://github.com/ezra-bible-app/ezra-bible-app/issues/548
[i346]: https://github.com/ezra-bible-app/ezra-bible-app/issues/346
[i542]: https://github.com/ezra-bible-app/ezra-bible-app/issues/542
[i546]: https://github.com/ezra-bible-app/ezra-bible-app/issues/546
[i543]: https://github.com/ezra-bible-app/ezra-bible-app/discussions/543

## [1.3.0 - 2021-10-24]

### Features

* Notes document export ([#96][i96])

### Enhancements

* Book text: Render tags in bold if they are used very often. ([#208][i208])
* Exchanged tag statistics button with compare button. ([#446][i446])
* Optimized formatting of book selection menu by using four columns for OT ([#442][i442])

### Fixes

* Fixed bug: Auto-detected locale was sometimes not matching with list of available locales. ([#467][i467])
* Fixed bug: Chapter loading mode was not considered when re-loading tabs after app upgrade. ([#488][i488])
* Fixed bug: Strongs transcription and phonetic transcription was showing `undefined` for related Strong's entries. ([#455][i455])
* Fixed bug: Change tags button was disappearing unintendedly with bigger screen resolutions. ([#448][i448])

### Enablers

* Added Brazilian Portuguese locale, thanks to Christian De Britto. ([#464][i464])
* Switched windows installer framework from electron-installer-windows to electron/windows-installer. ([#460][i460])
* Upgraded to latest Electron 13.x. ([#437][i437])

[i96]: https://github.com/ezra-bible-app/ezra-bible-app/issues/96
[i208]: https://github.com/ezra-bible-app/ezra-bible-app/issues/208
[i446]: https://github.com/ezra-bible-app/ezra-bible-app/issues/446
[i442]: https://github.com/ezra-bible-app/ezra-bible-app/pull/442
[i467]: https://github.com/ezra-bible-app/ezra-bible-app/issues/467
[i488]: https://github.com/ezra-bible-app/ezra-bible-app/issues/488
[i460]: https://github.com/ezra-bible-app/ezra-bible-app/pull/460
[i455]: https://github.com/ezra-bible-app/ezra-bible-app/issues/455
[i448]: https://github.com/ezra-bible-app/ezra-bible-app/issues/448
[i464]: https://github.com/ezra-bible-app/ezra-bible-app/pull/464
[i437]: https://github.com/ezra-bible-app/ezra-bible-app/issues/437

## [1.2.0 - 2021-08-29]

### Enhancements

* Reworked module install assistant ([#201][i201], [#238][i238], [#272][i272])
  * Show language selection as first step.
  * Optimized language listing.
* Android: Reduced height of tag assignment menu. ([#365][i365])
* Show dictionary box below the text when left toolbar is hidden. ([#77][i77])
* Android: Implemented dictionary word lookup for touch screens. ([#389][i389])
* Android: Highlight strongs words in currently selected verse. ([#413][i413])

### Fixes

* Fixed issues with NA28 rendering. ([#384][i384])
* Fixed module paths on macOS (also consider `$HOME/Library/Application Support/Sword`). ([#356][i356])
* Fixed bugs related to the repository update. ([#390][i390])
* Fixed bug on Android: Showing toolbar resulted in invalid / buggy layout. ([#337][i337])
* Fixed bug: Strong's dictionaries were not automatically installed. ([#404][i404])

### Enablers

* Introduced new CSS Grid based Layout. ([#302][i302])
* Added Debian 11 package. ([#431][i431])

[i77]: https://github.com/ezra-bible-app/ezra-bible-app/issues/77
[i201]: https://github.com/ezra-bible-app/ezra-bible-app/issues/201
[i238]: https://github.com/ezra-bible-app/ezra-bible-app/issues/238
[i272]: https://github.com/ezra-bible-app/ezra-bible-app/issues/272
[i302]: https://github.com/ezra-bible-app/ezra-bible-app/pull/302
[i337]: https://github.com/ezra-bible-app/ezra-bible-app/issues/337
[i356]: https://github.com/ezra-bible-app/ezra-bible-app/issues/356
[i365]: https://github.com/ezra-bible-app/ezra-bible-app/issues/365
[i384]: https://github.com/ezra-bible-app/ezra-bible-app/issues/384
[i389]: https://github.com/ezra-bible-app/ezra-bible-app/issues/389
[i390]: https://github.com/ezra-bible-app/ezra-bible-app/issues/390
[i404]: https://github.com/ezra-bible-app/ezra-bible-app/issues/404
[i413]: https://github.com/ezra-bible-app/ezra-bible-app/issues/413
[i431]: https://github.com/ezra-bible-app/ezra-bible-app/issues/431

## [1.1.0 - 2021-06-26]

### Features

* Desktop app: Added emoji picker to input fields (Create/rename tag, notes). ([#166][i166])
* Added a locale select box in the options menu that can be used to instantly switch to a different user interface language. ([#203][i203])
* Added functionality for opening and navigating book chapters individually. ([#283][i283])

### Enhancements

* Enhanced layout of current tab search function. ([#165][i165])
* Made dictionary component more responsive. ([#240][i240])
* Fixed text rendering issues with New English Translation. ([#237][i237])
* Disable Bible translation in translation select box if it does not contain the book that is opened in the current tab. ([#274][i274])
* Tag statistics - hide tags that have 0 occurrences. ([#324][i324])
* Added online help that gives an overview for all keyboard shortcuts (New tab in info popup dialog). ([#198][i198])
* Android: Localized startup messages. ([#323][i323])

### Fixes

* Fixed locale issues in Ukrainian and Russian book list. ([#233][i233])
* Fixed bug: Inconsistent cached Bible book list. ([#275][i275])
* Fixed bug: Labels in menu were wrapping when loading text. ([#325][i325])
* Fixed bug: Missing chapter title for modules without embedded chapter title. ([#329][i329])
* Fixed bug: Compare translations function too slow on Android. ([#331][i331])

### Enablers

* Added Romanian translation of the user interface. ([#308][i308])
* Introduced web components. Refactored display options as web components ([#247][i247])

[i165]: https://github.com/ezra-bible-app/ezra-bible-app/issues/165
[i166]: https://github.com/ezra-bible-app/ezra-bible-app/issues/166
[i198]: https://github.com/ezra-bible-app/ezra-bible-app/issues/198
[i203]: https://github.com/ezra-bible-app/ezra-bible-app/issues/203
[i233]: https://github.com/ezra-bible-app/ezra-bible-app/issues/233
[i237]: https://github.com/ezra-bible-app/ezra-bible-app/issues/237
[i240]: https://github.com/ezra-bible-app/ezra-bible-app/issues/240
[i247]: https://github.com/ezra-bible-app/ezra-bible-app/pull/247
[i274]: https://github.com/ezra-bible-app/ezra-bible-app/issues/274
[i275]: https://github.com/ezra-bible-app/ezra-bible-app/issues/275
[i283]: https://github.com/ezra-bible-app/ezra-bible-app/issues/283
[i308]: https://github.com/ezra-bible-app/ezra-bible-app/pull/308
[i323]: https://github.com/ezra-bible-app/ezra-bible-app/issues/323
[i324]: https://github.com/ezra-bible-app/ezra-bible-app/issues/324
[i325]: https://github.com/ezra-bible-app/ezra-bible-app/issues/325
[i329]: https://github.com/ezra-bible-app/ezra-bible-app/issues/329
[i331]: https://github.com/ezra-bible-app/ezra-bible-app/issues/331

## [1.0.2 - 2021-06-04]

This is a bugfix release only applicable for Android.

### Fixes

* Fixed bug: Repositories not loaded on Android ([#330][i330])

[i330]: https://github.com/ezra-project/ezra-project/issues/330

## [1.0.1 - 2021-05-31]

This is a bugfix release only applicable for Android.

### Fixes

* Fixed bug: Android 11 startup issues ([#322][i322])
* Fixed bug: Icon-based note indicators were not synchronized with multiple tabs ([#234][i234])

[i234]: https://github.com/ezra-project/ezra-project/issues/234
[i322]: https://github.com/ezra-project/ezra-project/issues/322

## [1.0.0 - 2021-04-24]

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
* Re-established execution of Cucumber acceptance tests via GitHub Actions. ([#213][i213])

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

## [0.17.1 - 2021-02-21]

This is a bugfix release only applicable for macOS and Android.

### Fixes

* Fixed bug on Android: Module install assistant times out when retrieving repository languages. ([#184][i184])
* Fixed bug on macOS: Could not re-activate window after closing it once. ([#183][i183])

[i183]: https://github.com/ezra-project/ezra-project/issues/183
[i184]: https://github.com/ezra-project/ezra-project/issues/184

## [0.17.0 - 2021-02-20]

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
  - Strong's based search with link 'Find all occurrences' in info box.
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
* Word file export functionality for tagged verse lists
* Info popup for Bible translation-related information (shows meta information from the `*.conf` files that come with each SWORD module)
* New vertical navigation bar to the left of the Bible text
  * Shows chapters in case of a Bible book
  * Shows Bible books in case of a tagged verse list

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
