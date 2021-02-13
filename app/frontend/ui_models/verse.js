class Verse {
  constructor(bibleBookShortTitle, absoluteVerseNr, chapter, verseNr, isBookNoteVerse) {
    this._bibleBookShortTitle = bibleBookShortTitle;
    this._bibleBookId = bibleBookShortTitle.toLowerCase();
    this._absoluteVerseNr = absoluteVerseNr;
    this._chapter = chapter;
    this._verseNr = verseNr;
    this._isBookNoteVerse = isBookNoteVerse;
  }
}

module.exports = Verse;