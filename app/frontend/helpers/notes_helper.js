
const removeMd = require('remove-markdown');

const MAX_TOOLTIP_LENGTH = 100;


function getTooltipText (noteText) {
  if(noteText && noteText.trim() !== "") {
    const deMarked = removeMd(noteText).replace(/\s*\n\s*/mg, ' - ');
    return deMarked.length > MAX_TOOLTIP_LENGTH ? deMarked.slice(0, MAX_TOOLTIP_LENGTH) + "..." : deMarked;
  } else {
    return i18n.t('bible-browser.new-note-hint');
  }
}


module.exports = {
  getTooltipText
}