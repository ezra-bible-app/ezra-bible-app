# Contributing to Ezra Bible App

:+1::tada: First off, thanks for taking the time to contribute! :tada::+1:

The following is a set of guidelines for contributing to Ezra Bible App. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Reporting Bugs

* When reporting bugs, please assign the bug 🐞 label.
* Include information about your operating system/platform.
* Include information about the sequence of steps to reproduce the issue.
* Include a screenshot if that helps to describe the issue.

## Suggesting Enhancements and New Features

`TODO`

## Pull Requests

If you want to make direct contributions to Ezra Bible App, please create a pull request based on your work. Once the pull request has been created the process is as follows:

1) A review takes place. The goal is to ensure good quality and style. You may need to rework your contribution based on review comments.
2) Once the pull request is considered good enough by the Ezra Bible App maintainer it will be merged to the main branch.

## New Translations

If you want to help with a new translation, these are the steps:

1) Clone the repository. If you are not a project member yet you may need to fork first and then clone your fork.

2) Take the English locale files as a base (`/locales/en`) and copy them to a new folder underneath `locales`, where the folder name shall match the two-letter ISO 639-1 language code of the new translation. Have a look at [this Wikipedia page](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) to find the language code for the new language.

3) The locale files are json files. You will have to translate the value of each `json key`. Consider the following extract. You will have to translate all the text on the right side of the colon. So for example within `"new tag": "New tag"` you will replace the text `"New tag"` with the respective translation.

```javascript
    "tags-toolbar": {
      "new-tag": "New tag",
      "tag-statistics": "Tag statistics",
      "assign-last-tag": "Assign last tag",
      "configure-translations": "Configure translations",
      "configure-dicts": "Configure dictionaries",
      "show-parallel-translations": "Compare translations",
      "compare": "Compare",
      "context": "Context"
    }
```

Please do not translate the product name "Ezra Bible App" and also keep unique terms like "Strong's", "CrossWire Bible Society" and "SWORD".

4) Once the translation is complete, it needs to be added to the `AVAILABLE_LOCALES` list in [`/app/frontend/controllers/i18n_controller.js`](https://github.com/ezra-bible-app/ezra-bible-app/blob/master/app/frontend/controllers/i18n_controller.js):
```
const AVAILABLE_LOCALES = ['de', 'en', 'nl', 'fr', 'es', 'sk', 'uk', 'ru'];  <== Add the language
```

5) Add your name and GitHub profile link to the list of translators in [`app/frontend/components/info_popup.js`](https://github.com/ezra-bible-app/ezra-bible-app/blob/master/app/frontend/components/info_popup.js#L106).

6) You can test the new translation by installing all dependencies (see BUILD.md) and starting the app using `npm start`. Once you start the app there should be the new option under App Language select box in the settings.

7) Submit a pull request once you have a working draft.

### Using different word forms in translations

Unlike English some languages have more complicated grammar with word forms changing depending upon their role in the sentence (cases) and articles changing depending on their gender or number. To accommodate this it is possible to define additional forms of the word:
```json
    "module-type-dict": "Словари",
    "module-type-dict_genitive": "словарей",
    "module-type-dict_instrumental": "словарями",
    "module-type-dict_singular": "словарь",
    "module-type-dict_singular-genitive": "словаря",
    "module-type-dict_singular-instrumental": "словаре",
```
To use these definitions in the translation string add the appropriate word form (part after underscore) as an additional format parameter. For example (Russian):
```json
      "show-detailed-module-info": "Нажмите на иконке информации для отображения подробностей о {{module_type, singular-instrumental}}."
```
Please note, that different languages may require different forms. So as a translator you may need to add an extra form. (For English the forms are given as an example in the localization file. Feel free to delete unused forms for your language).

The string in the example above will use the nominative form in English:
```json
      "show-detailed-module-info": "Click on the information icon to see more details about the {{module_type, singular}}."
```
But it will need an extra form in German because demonstrative pronouns change depending on the gender of the word:
```json
      "show-detailed-module-info": "Klicken Sie auf das Informationssymbol um mehr Informationen zu {{module_type, singular-demonstrative-pronoun}} anzuzeigen."
```
So an extra form needs to be added:
```json
    "module-type-bible_singular-demonstrative-pronoun": "die Bibelübersetzung",
    "module-type-dict_singular-demonstrative-pronoun": " das Wörterbuch",
```

### Translating Translations and Dictionary Assistant

The Assistant for installing and removing modules is a crucial part of the onboarding process for new users. Please keep in mind new non-technical users and try to clearly communicate the idea behind phrase versus literal translation. Avoid using technical terms such as "module" unless there no way around it ("repository" is unavoidable). As the process of installation is the same for Bible translations and Dictionaries, `{{module_type}}` is used in place of the appropriate word in the translation. Please note that `{{module_type}}` is using word forms as mentioned in the previous section. Additionally, changing case is available as an additional parameter. I.e. use `{{module_type, capitalize}}` to capitalize only the first letter of the first word. Or use `title-case` to capitalize the first letter of each word. There is no lowercase function, so the initial word form should be lowercase if there are rules about that in your language. 

Please, feel free to add your suggestions in the (Discussions)[https://github.com/ezra-bible-app/ezra-bible-app/discussions].

### Translating emoji categories

Emojis are standardized in [Unicode](http://unicode.org/emoji/charts/full-emoji-list.html). Their descriptions/annotations for searching are available in multiple languages via [CLDR](https://unicode-org.github.io/cldr-staging/charts/latest/annotations/index.html). This is used to assemble an emoji list automatically in any locale. 

However, emoji categories are not standardized and vary from system to system. So there is a need to manually translate emoji categories. You can look up what is commonly accepted in your language on any mobile device with emojis.

## Hints for development

### Pug templates

Whenever you make changes to the [Pug](https://pugjs.org/) templates (see [/app/templates](https://github.com/ezra-bible-app/ezra-bible-app/tree/master/app/templates)) you need to re-compile them afterwards. You can do this by invoking `npm run compile-pug`.

### Chrome dev tools

You can enable the Chrome dev tools you know from your browser with the short cut `CTRL + SHIFT + i` on Linux and `CMD + ALT + i` on macOS.
In the dev tools you can inspect the DOM, debug your JavaScript code, etc. - as you are used to it from the browser!

### Automated tests

Cucumber is used for end-to-end functional/acceptance testing. You should regularly run the tests to ensure that new code does not result in regressions. The tests are currently only running on Linux and macOS. To execute them you can run:

- `npm run full-test` to execute the tests in the foreground.
- `npm run headless-test` to execute the tests in the background without showing the window (Linux-only).
- `npm run dev-test` to execute the tests only until an error is encountered (Stop after the first error).

### Impact of Browserify

[Browserify](http://browserify.org/) is used to package all JavaScript files into one file for production. This enhances performance during production and is required for Android. Your code will have to work with Browserify and there are a few things to consider:

- `require` statements cannot use variables.
- You cannot use some of the most recent JavaScript features (like optional chaining). You will have to try and see.
- The JS bundle generated by `npm run bundle` is stored at `/dist/ezra_init.js`.
- There is a switch in `/app/frontend/platform_init.js` that loads `/app/frontend/ezra_init.js` during development and `/dist/ezra_init.js` during production.
- Note that for the Android/Cordova app `/dist/ezra_init.js` is always used.

### Git configuration

Use `git config pull.rebase true`, so that up-stream changes are nicely integrated when you pull them on your local repo.
Otherwise you regularly get the merge commit + corresponding messages just because you have been ahead of the remote repo at the time of pulling.

### Switching branches

When switching branches you may run into issues due to incompatible cache files or outdated pug template code. In that case:

1. Delete the html-cache.json file (The location is shown on the console at startup)
2. Re-generate the pug templates by running `npm run compile-pug`.
