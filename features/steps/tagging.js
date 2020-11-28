const { Given, When, Then } = require("cucumber");
const { assert } = require("chai");

Given('I create the tag {string}', async function (tagName) {
  var verseListTabs = await global.app.client.$('#verse-list-tabs-1');
  var newTagButton = await verseListTabs.$('.new-standard-tag-button');
  await newTagButton.click();

  var newTagTitleInput = await global.app.client.$('#new-standard-tag-title-input');
  await newTagTitleInput.setValue(tagName);

  await global.app.client.keys('Enter');
});

When('I assign the tag {string} to the current verse selection', async function (tagName) {
  var tagsList = await global.app.client.$('#tags-content-global');
  var allTags = await tagsList.$$('.checkbox-tag');
  var tagCount = allTags.length;
  var tagFound = false;

  assert(tagCount == 1, `The tagCount is not 1, but ${tagCount}`);

  for (var i = 0; i < allTags.length; i++) {
    this.currentTag = allTags[i];

    var currentLabel = await this.currentTag.$('.cb-label');
    var currentLabelText = await currentLabel.getText();

    if (currentLabelText == tagName) {
      tagFound = true;
      this.currentTagCheckbox = await this.currentTag.$('.tag-cb');
      await this.currentTagCheckbox.click();
      break;
    }
  }

  assert(tagFound, `The tag '${tagName}' could not be found in the list!`)
});

Then('the tag {string} is assigned to {string} in the database', async function (tagName, verseReference) {
  await global.spectronHelper.initDatabase();
  var tags = await global.models.Tag.getAllTags();

  assert(tags.length == 1, `Did not get 1 tag, but ${tags.length} tags!`);

  var firstTag = tags[0];
  assert(firstTag.title == tagName, `DB tag title is not ${tagName}, but ${firstTag.title}`);

  var splittedReference = verseReference.split(' ');
  var book = splittedReference[0];
  var bookId = global.spectronHelper.getBookShortTitle(book);
  var verseReferenceString = splittedReference[1];

  var dbBibleBook = await global.models.BibleBook.findOne({ where: { shortTitle: bookId } });
  var verseReferenceHelper = await global.spectronHelper.getVerseReferenceHelper();
  var absoluteVerseNumber = verseReferenceHelper.referenceStringToAbsoluteVerseNr('KJV', bookId, verseReferenceString);

  var verseReference = await global.models.VerseReference.findOne({
    where: {
      bibleBookId: dbBibleBook.id,
      absoluteVerseNrEng: absoluteVerseNumber
    }
  });

  var verseTags = await global.models.VerseTag.findByVerseReferenceIds(verseReference.id);

  assert(verseTags.length == 1, `Expected 1 verse tag, but got ${verseTags.length}`);

  var verseTagId = verseTags[0].tagId;
  assert(verseTagId == firstTag.id, `VerseTag associated with wrong tag id ${verseTagId}, expected ${firstTag.id}`);
});

Then('the tag {string} is visible in the bible browser at the selected verse', async function (tagName) {
  var tagBox = await this.selectedVerseBox.$('.tag-box');
  var tags = await tagBox.$$('.tag');

  assert(tags.length == 1, `Expected 1 tag, but got ${tags.length}`);

  var firstTagTitle = await tags[0].getText();
  assert(firstTagTitle == tagName, `Expected browser tag with title '${tagName}', but got '${firstTagTitle}'`);
});