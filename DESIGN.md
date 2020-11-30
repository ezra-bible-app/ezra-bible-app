Welcome to the Design documentation of Ezra Project!

<a href='#file-structure'>File structure</a> | <a href='#db-schema'>Database schema</a>

## Architecture overview

Ezra Project mostly uses plain, vanilla JavaScript in combination with some additional technology like jQuery, jQuery UI, Sequelize and the Pug template engine. For performance reasons, it does not use a web framework like React or Angular. Nevertheless, the architecture is designed in a modular way and should make it easy for new developers.

### Controllers

Controllers are classes that manage one or several (graphical) components and usually also interact with the Ezra Project database, e.g. the `TagsController` and `NotesController`.

The most notable Controller is the `AppController`, which is responsible for initializing all other controllers and components.

### Components

Components are classes that usually represent one specific "graphical component" of the UI, e.g. the options menu or the book selection menu.

### Sequelize Models

Sequelize (an object-oriented wrapper) is used to manage the interface to the (SQLite) database. Each database table is represented by one model. Besides the standard Sequelize API that is attached to every model, you find various custom querying functions in the models.

### node-sword-interface

To access SWORD modules, Ezra Project uses the [node-sword-interface](https://github.com/ezra-project/node-sword-interface) library. This library is implemented in C++ and offers a simple, flat, facade style interface that wraps calls to the SWORD library.

### The big picture

<div class="mermaid">
erDiagram
    ezra_init                 ||--|{    HTML-Component            : loads
    ezra_init                 ||--||    Component-or-Controller   : initializes
    ezra_init                 ||--||    Sequelize-Model           : initializes
    HTML-Component            }|--||    DOM                       : is-part-of
    Component-or-Controller   }|--|{    HTML-Component            : modifies
    Component-or-Controller   }|--|{    JS-Event                  : handles
    Component-or-Controller   }|--||    electron-settings         : uses
    electron-settings         ||--||    Settings-JSON-File        : manages
    Component-or-Controller   ||--|{    node-sword-interface      : uses
    Component-or-Controller   }|--|{    Sequelize-Model           : uses
    Sequelize-Model           ||--||    SQLite-DB-Table           : maps
    node-sword-interface      ||--||    SWORD-Engine              : wraps
</div>

<a name='file-structure'></a>

## File structure

On the top-level these are the most relevant files and directories.

### main.js

Standard node.js / Electron start script. This is not changed very often.

### index.html

Basic html template loaded initially on startup. Additional content is dynamically added to the DOM by `ezra_init.js`.

### app/ezra_init.js

Entry script of the Electron renderer process for initializing the user interface. This is referenced in the `index.html` file. The code in `ezra_init.js` is only used for startup.

### app

This directory contains the JavaScript source code of Ezra Project. It contains the following parts:

* `components`: Graphical components of the UI, e.g. `BookSelectionMenu`, `NavigationPane`, `OptionsMenu`, etc.
* `controllers`: Controllers are classes that "bring live" into the UI and respond to user actions. All Controllers are named `<Name>Controller` and the file name is `<name>_controller.js`.
* `database`: Database related source code (models, migrations)
* `helpers`: Helper classes that make various tasks more easy, but usually don't interact with the UI directly
* `templates`: [pug](https://pugjs.org/) templates
* `ui_models`: Model classes for objects in the user interface. May be instantiated multiple times if there are multiple instances of a certain object in the UI.

### css

Here you find CSS stylesheets.

### html

This directory contains static HTML files (e.g. for the book selection menu, the display options menu, etc.). These files are loaded dynamically into the DOM by `ezra_init.js`.

### locales

Here you find [i18next](https://www.i18next.com/) locale files (JSON format).

Note that for adding a new locale you must also add an entry in the whitelist in `app/helpers/i18n_helper.js` (line 42).

<a name='db-schema'></a>

## Database schema

<div class="mermaid">
erDiagram
    BibleBook                 ||--|{    VerseReference      : has
    Note                      o|--||    VerseReference      : has
    VerseReference            ||--|{    VerseTag            : has
    Tag                       ||--|{    VerseTag            : has
</div>

<script src="https://unpkg.com/mermaid@8.8.3/dist/mermaid.min.js"></script>