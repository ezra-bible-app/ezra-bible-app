const languageMapper = require('../language_mapper');

describe('languageMapper', () => {

  it('gets two letter code language details', () => {
    const details = languageMapper.getLanguageDetails('es');
    expect(details.languageName).toEqual('Spanish');
    expect(details.type).toEqual('living');
    expect(details.localized).toEqual(false);
  });

  it('gets three letter code language details', () => {
    const result = languageMapper.getLanguageDetails('grc');
    expect(result.languageName).toEqual('Ancient Greek (to 1453)');
    expect(result.type).toEqual('historical');
    expect(result.localized).toEqual(false);
  });

  it('gets language name', () => {
    const result = languageMapper.getLanguageName('ro');
    expect(result).toEqual('Romanian');
  });

  it('gets language code', () => {
    const result = languageMapper.getLanguageCode('Hebrew');
    expect(result).toEqual('he');
  });
});