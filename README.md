<h1 align="center">Ezra Bible App</h1>
<p align="center" style="font-style: italic">
"For Ezra had set his heart to study the Law of the LORD,<br/>
and to do it and to teach his statutes and rules in Israel." Ezra 7:10
</p>

<p align="center">
  <a href="https://github.com/ezra-bible-app/ezra-bible-app/actions/workflows/test.yml">
    <img src="https://github.com/ezra-bible-app/ezra-bible-app/actions/workflows/test.yml/badge.svg"></img>
  </a>
  
  <a href="https://github.com/ezra-bible-app/ezra-bible-app/actions/workflows/build.yml">
    <img src="https://github.com/ezra-bible-app/ezra-bible-app/actions/workflows/build.yml/badge.svg"></img>
  </a>
</p>

Ezra Bible App is a modern and user-friendly, cross-platform Bible app focussing on topical study based on keywords/tags. This program can help you to easily manage your topical verse lists and verse-based notes. Ezra Bible App works with [SWORD Bible translation modules](http://www.crosswire.org/sword) and thus enables Bible study in many languages. It runs on Windows, macOS and Linux desktop computers as well as on [Android tablets](https://play.google.com/store/apps/details?id=net.ezrabibleapp.cordova). Click [here](https://github.com/ezra-bible-app/ezra-bible-app/releases/latest) to get the latest release.

For user information (features, screenshots, install instructions) have a look at the [project's website](https://ezrabibleapp.net). This GitHub page focusses on technical information.

![Ezra Project 0.11.0](https://ezrabibleapp.net/assets/screenshots/ezra_project_0_11_0.png "Ezra Project 0.11.0")

## Development

### Technology
Ezra Bible App is a cross-platform application based on web technology. On the desktop it is powered by [Electron](https://electronjs.org/), on Android it is powered by [Cordova](https://cordova.apache.org/). It is programmed in JavaScript, uses [SQLite](https://www.sqlite.org) as its database and HTML with [jQuery UI](https://jqueryui.com/) for its frontend. Bible translation modules are managed using [node-sword-interface](https://github.com/ezra-bible-app/node-sword-interface).

For more details regarding the used components have a look [here][tech].

[tech]: https://github.com/ezra-bible-app/ezra-bible-app/blob/master/TECH.md

### Design

Ezra Bible App's architecture is designed in a modular way and should make it easy for new developers. There is a backend and a frontend. The backend deals with the SWORD API as well as database persistence and settings. The frontend is component-based and uses an event bus for establishing communication between the components in a loosely coupled fashion.

Detailed design documentation is available here: https://apidocs.ezrabibleapp.net

### Building Ezra Bible App

Have a look at the build instructions [here][build].

[build]: https://github.com/ezra-bible-app/ezra-bible-app/blob/master/BUILD.md

### Contribution Guidelines

Have a look at the contribution guidelines [here][contributing].

[contributing]: https://github.com/ezra-bible-app/ezra-bible-app/blob/master/CONTRIBUTING.md

## Discussions

Join the [discussions here on GitHub](https://github.com/ezra-bible-app/ezra-bible-app/discussions) to discuss any of the existing functionality, ask questions and make suggestions for new features!

## Feedback
To give feedback (bug reports, feature requests) please use the Github issue system.
Click [here](https://github.com/ezra-bible-app/ezra-bible-app/issues/new) to file a new Issue for Ezra Bible App.

[latest]: https://github.com/ezra-bible-app/ezra-bible-app/releases/latest

## Join the team!
Your contributions to Ezra Bible App are very welcome!
Ideally you should bring some experience in working with web-based frontends, specifically HTML, CSS, JavaScript. Furthermore, experience with relational database design is a plus. However, if you're not a developer you can still help with testing, translation and user documentation!
Have a look at the [contribution guidelines][contributing] for some more details!

Feel free to drop us an email ([contact@ezrabibleapp.net](mailto:contact@ezrabibleapp.net)) if you are interested in joining the team!
