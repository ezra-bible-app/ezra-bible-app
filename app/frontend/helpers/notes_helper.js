
const marked = require("marked");

const MAX_TOOLTIP_LENGTH = 256;


function getTooltipText (noteText) {
  if(noteText && noteText.trim() !== "") {
    return marked.parseInline(noteText.length > MAX_TOOLTIP_LENGTH ? noteText.slice(0, MAX_TOOLTIP_LENGTH) + "..." : noteText);
  } else {
    return i18n.t('bible-browser.new-note-hint');
  }
}


module.exports = {
  getTooltipText
}