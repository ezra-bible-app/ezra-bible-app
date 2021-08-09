const languageMapper = require('../language_mapper');

describe('languageMapper', () => {

  it('gets two letter code language details', () => {
    const details = languageMapper.getLanguageDetails('es');
    expect(details.languageName).toEqual('Spanish');
    expect(details.type).toEqual('living');
    expect(details.localized).toEqual(true);
  });

  it('gets three letter code language details', () => {
    const result = languageMapper.getLanguageDetails('grc');
    expect(result.languageName).toEqual('Ancient Greek');
    expect(result.type).toEqual('historical');
    expect(result.localized).toEqual(true);
  });

  it('gets language name', () => {
    const result = languageMapper.getLanguageName('ro');
    expect(result).toEqual('Romanian');
  });

  it('returns result even when Intl API is not available', () => {
    const result = languageMapper.getLanguageName('he', 'ru');
    expect(result).toEqual('Иврит');
  });
});