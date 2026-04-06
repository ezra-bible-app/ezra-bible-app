/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

/**
 * Parses Open Scriptures Hebrew Morphology (OSHM) codes.
 *
 * These codes are used by the Open Scriptures Hebrew Bible SWORD module
 * to tag each word with grammatical information. Codes are prefixed with
 * a language character (H=Hebrew, A=Aramaic) and use slash-separated
 * segments for prefixes, main word, and suffixes.
 *
 * Code format: Language[Prefix/...]/MainWord[/Suffix]
 *   - Language: H (Hebrew) or A (Aramaic)
 *   - Each segment starts with a POS character: A (Adjective), C (Conjunction),
 *     D (Adverb), N (Noun), P (Pronoun), R (Preposition), S (Suffix),
 *     T (Particle), V (Verb)
 *   - Attributes follow POS: type, stem (verbs), conjugation (verbs),
 *     person, gender, number, state — depending on POS
 *   - 'x' is used as a placeholder for unknown/unnecessary values
 *
 * Reference:
 *   - OSHM spec: https://hb.openscriptures.org/parsing/HebrewMorphologyCodes.html
 */
class OpenScripturesHebrewMorphologyParser {

  constructor() {
    this.language = {
      H: "Hebrew",
      A: "Aramaic"
    };

    this.adjectiveType = {
      a: "Adjective",
      c: "Cardinal Number",
      g: "Gentilic",
      o: "Ordinal Number"
    };

    this.nounType = {
      c: "Common",
      g: "Gentilic",
      p: "Proper Name"
    };

    this.pronounType = {
      d: "Demonstrative",
      f: "Indefinite",
      i: "Interrogative",
      p: "Personal",
      r: "Relative"
    };

    this.prepositionType = {
      d: "Definite Article"
    };

    this.suffixType = {
      d: "Directional He",
      h: "Paragogic He",
      n: "Paragogic Nun",
      p: "Pronominal"
    };

    this.particleType = {
      a: "Affirmation",
      d: "Definite Article",
      e: "Exhortation",
      i: "Interrogative",
      j: "Interjection",
      m: "Demonstrative",
      n: "Negative",
      o: "Direct Object Marker",
      r: "Relative"
    };

    this.verbConjugation = {
      p: "Perfect",
      q: "Sequential Perfect",
      i: "Imperfect",
      w: "Sequential Imperfect",
      h: "Cohortative",
      j: "Jussive",
      v: "Imperative",
      r: "Participle Active",
      s: "Participle Passive",
      a: "Infinitive Absolute",
      c: "Infinitive Construct"
    };

    // Case-sensitive: lowercase and uppercase map to different stems
    this.hebrewVerbStem = {
      q: "Qal",
      N: "Niphal",
      p: "Piel",
      P: "Pual",
      h: "Hiphil",
      H: "Hophal",
      t: "Hithpael",
      o: "Polel",
      O: "Polal",
      r: "Hithpolel",
      m: "Poel",
      M: "Poal",
      k: "Palel",
      K: "Pulal",
      Q: "Qal Passive",
      l: "Pilpel",
      L: "Polpal",
      f: "Hithpalpel",
      D: "Nithpael",
      j: "Peal",
      a: "Liphil",
      i: "Pilel",
      u: "Hothpaal",
      c: "Tiphil",
      v: "Hishtaphel",
      w: "Nithpalel",
      y: "Nithpoel",
      z: "Hithpoel"
    };

    this.aramaicVerbStem = {
      q: "Peal",
      Q: "Peil",
      u: "Hithpeel",
      p: "Pael",
      P: "Ithpaal",
      M: "Hithpaal",
      a: "Aphel",
      h: "Haphel",
      s: "Saphel",
      e: "Shaphel",
      H: "Hophal",
      i: "Ithpeel",
      t: "Hishtaphal",
      v: "Ishtaphal",
      w: "Hithaphal",
      o: "Polel",
      z: "Ithpolel",
      r: "Hithpolel",
      f: "Hithpalpel",
      b: "Hephal",
      c: "Tiphil",
      m: "Poel",
      l: "Palpel",
      L: "Ithpalpel",
      O: "Ithpolel",
      G: "Ittaphal"
    };

    this.person = {
      "1": "1st Person",
      "2": "2nd Person",
      "3": "3rd Person"
    };

    this.gender = {
      b: "Both",
      c: "Common",
      f: "Feminine",
      m: "Masculine"
    };

    this.number = {
      d: "Dual",
      p: "Plural",
      s: "Singular"
    };

    this.state = {
      a: "Absolute",
      c: "Construct",
      d: "Determined"
    };

    this._participleConjugations = new Set(['r', 's']);
    this._infinitiveConjugations = new Set(['a', 'c']);
  }

  _parseSegment(segment, lang) {
    const pos = segment[0];
    const attrs = segment.slice(1);
    const parts = [];

    switch (pos) {
      case 'A': {
        // Adjective: type + gender + number + state
        parts.push("Adjective");
        if (attrs[0] && attrs[0] !== 'x') {
          var at = this.adjectiveType[attrs[0]];
          if (at && at !== "Adjective") parts.push(at);
        }
        if (attrs[1] && attrs[1] !== 'x') parts.push(this.gender[attrs[1]]);
        if (attrs[2] && attrs[2] !== 'x') parts.push(this.number[attrs[2]]);
        if (attrs[3] && attrs[3] !== 'x') parts.push(this.state[attrs[3]]);
        break;
      }
      case 'C': {
        parts.push("Conjunction");
        break;
      }
      case 'D': {
        parts.push("Adverb");
        break;
      }
      case 'N': {
        // Noun: type + gender + number + state
        parts.push("Noun");
        if (attrs[0] && attrs[0] !== 'x') parts.push(this.nounType[attrs[0]]);
        if (attrs[1] && attrs[1] !== 'x') parts.push(this.gender[attrs[1]]);
        if (attrs[2] && attrs[2] !== 'x') parts.push(this.number[attrs[2]]);
        if (attrs[3] && attrs[3] !== 'x') parts.push(this.state[attrs[3]]);
        break;
      }
      case 'P': {
        // Pronoun: type + person + gender + number
        parts.push("Pronoun");
        if (attrs[0] && attrs[0] !== 'x') parts.push(this.pronounType[attrs[0]]);
        if (attrs[1] && attrs[1] !== 'x') parts.push(this.person[attrs[1]]);
        if (attrs[2] && attrs[2] !== 'x') parts.push(this.gender[attrs[2]]);
        if (attrs[3] && attrs[3] !== 'x') parts.push(this.number[attrs[3]]);
        break;
      }
      case 'R': {
        // Preposition: type
        parts.push("Preposition");
        if (attrs[0] && attrs[0] !== 'x') parts.push(this.prepositionType[attrs[0]]);
        break;
      }
      case 'S': {
        // Suffix: type + person + gender + number
        parts.push("Suffix");
        if (attrs[0] && attrs[0] !== 'x') parts.push(this.suffixType[attrs[0]]);
        if (attrs[1] && attrs[1] !== 'x') parts.push(this.person[attrs[1]]);
        if (attrs[2] && attrs[2] !== 'x') parts.push(this.gender[attrs[2]]);
        if (attrs[3] && attrs[3] !== 'x') parts.push(this.number[attrs[3]]);
        break;
      }
      case 'T': {
        // Particle: type
        parts.push("Particle");
        if (attrs[0] && attrs[0] !== 'x') parts.push(this.particleType[attrs[0]]);
        break;
      }
      case 'V': {
        // Verb: stem + conjugation + person + gender + number [+ state for participles]
        var stemLookup = (lang === 'A') ? this.aramaicVerbStem : this.hebrewVerbStem;
        parts.push("Verb");
        if (attrs[0]) parts.push(stemLookup[attrs[0]] || attrs[0]);
        if (attrs[1] && attrs[1] !== 'x') parts.push(this.verbConjugation[attrs[1]]);

        if (attrs[1] && this._participleConjugations.has(attrs[1])) {
          // Participle: gender + number + state (no person)
          if (attrs[2] && attrs[2] !== 'x') parts.push(this.gender[attrs[2]]);
          if (attrs[3] && attrs[3] !== 'x') parts.push(this.number[attrs[3]]);
          if (attrs[4] && attrs[4] !== 'x') parts.push(this.state[attrs[4]]);
        } else if (attrs[1] && this._infinitiveConjugations.has(attrs[1])) {
          // Infinitive: no person/gender/number, but may have state
          if (attrs[2] && attrs[2] !== 'x') parts.push(this.state[attrs[2]]);
        } else {
          // Finite verb: person + gender + number
          if (attrs[2] && attrs[2] !== 'x') parts.push(this.person[attrs[2]]);
          if (attrs[3] && attrs[3] !== 'x') parts.push(this.gender[attrs[3]]);
          if (attrs[4] && attrs[4] !== 'x') parts.push(this.number[attrs[4]]);
        }
        break;
      }
      default: {
        parts.push(segment);
        break;
      }
    }

    return parts.filter(p => p != null);
  }

  parse(code) {
    const result = {
      original: code,
      partOfSpeech: null,
      segments: [],
      readable: ""
    };

    if (!code) return result;

    // First character is language (H or A)
    var lang = code[0];
    var rest = code.slice(1);
    result.language = this.language[lang] || null;

    // Split by slash into segments
    var rawSegments = rest.split("/");

    for (var i = 0; i < rawSegments.length; i++) {
      var segParts = this._parseSegment(rawSegments[i], lang);
      result.segments.push(segParts);
    }

    // The main word segment is the last non-suffix or the primary content segment
    // For POS, use the first segment that is a content word (N, V, A, P)
    for (var j = 0; j < result.segments.length; j++) {
      var firstPart = result.segments[j][0];
      if (firstPart === "Noun" || firstPart === "Verb" || firstPart === "Adjective" || firstPart === "Pronoun") {
        result.partOfSpeech = firstPart;
        break;
      }
    }

    if (!result.partOfSpeech && result.segments.length > 0) {
      result.partOfSpeech = result.segments[0][0];
    }

    result.readable = this.toReadable(result);
    return result;
  }

  toReadable(parsed) {
    if (!parsed.segments || parsed.segments.length === 0) {
      return parsed.partOfSpeech || "";
    }

    var segmentStrings = parsed.segments.map(function(seg) {
      return seg.join(" · ");
    });

    var result = segmentStrings.join(" + ");

    if (parsed.language) {
      result = parsed.language + ": " + result;
    }

    return result;
  }
}

module.exports = OpenScripturesHebrewMorphologyParser;
