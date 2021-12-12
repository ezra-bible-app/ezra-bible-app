const { parseLine, addDataToMap } = require("../sword_locales_to_json");

describe('SWORD languages data parsing', () => {

  it('extracts data from the line', () => {
    expect(parseLine("ce-Cyrl.en=Chechen (Cyrillic script)")).toEqual({ code: "ce", script: "Cyrl", locale: "en", name: "Chechen (Cyrillic script)" });
    expect(parseLine("dz.en=Dzongkha")).toEqual({ code: "dz", script: undefined, locale: "en", name: "Dzongkha" });
    expect(parseLine("dz=རྫོང་ཁ")).toEqual({ code: "dz", script: undefined, locale: undefined, name: "རྫོང་ཁ" });
    expect(parseLine("Xsux.en=Sumero-Akkadian cuneiform")).toEqual({ code: "Xsux", script: undefined, locale: "en", name: "Sumero-Akkadian cuneiform" });
  });



  it('transforms data to object', () => {
    var langData = {
      scripts: ["Cyrl"]
    };
    expect(addDataToMap({}, "Азәрбајҹан", "Cyrl")).toEqual(langData);

    expect(addDataToMap(langData, "Azərbaycan / Азәрбајҹан / آذربایجان")).toEqual({ name: "Azərbaycan / Азәрбајҹан / آذربایجان", ...langData });

    langData = { name: "Azərbaycan / Азәрбајҹан / آذربایجان", ...langData };
    expect(addDataToMap(langData, "Azerbaijani", undefined, "en")).toEqual({ en: "Azerbaijani", ...langData });

    expect(addDataToMap(langData, "Azərbaycan", "Latn")).toEqual({
      ...langData,
      scripts: ["Cyrl", "Latn"],
    });

    langData = {
      scripts: ["Cyrl"],
    };
    expect(addDataToMap(langData, "Bashkir (Cyrillic script)", "Cyrl", "en")).toEqual(langData);

  });
});