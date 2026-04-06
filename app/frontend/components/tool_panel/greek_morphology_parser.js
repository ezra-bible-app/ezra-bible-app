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
 * Parses Robinson's Morphological Analysis Codes for Greek NT text.
 *
 * These codes are used by the SWORD library's Robinson morphology module
 * to tag each word in the Greek New Testament with grammatical information.
 *
 * Code format: POS[-morphology[-extra]]
 *   - Single-letter POS: N (Noun), V (Verb), T (Article), A (Adjective),
 *     P (Personal Pronoun), R (Relative Pronoun), C (Reciprocal Pronoun),
 *     D (Demonstrative Pronoun), K (Correlative Pronoun), I (Interrogative Pronoun),
 *     X (Indefinite Pronoun), Q (Correlative/Interrogative Pronoun),
 *     F (Reflexive Pronoun), S (Possessive Pronoun)
 *   - Multi-letter POS (indeclinable): CONJ, COND, ADV, PREP, PRT, INJ, HEB, ARAM
 *   - Verbs: tense+voice+mood[+person+number] or participle with case+number+gender
 *   - Second-form tenses prefixed with "2" (e.g. V-2AAI-3S = Second Aorist)
 *   - Nouns/Articles/Adjectives: case+number+gender
 *   - Pronouns: person+case+number[+gender] or case+number+gender depending on type
 *
 * References:
 *   - Robinson morphology codes: https://github.com/byztxt/robinson-documentation
 *   - Byzantine Majority Text (Robinson-tagged): https://github.com/byztxt/byzantine-majority-text
 *   - SWORD project Robinson module: https://crosswire.org/sword
 */
class GreekMorphologyParser {

  constructor() {
    this.partsOfSpeech = {
      N: "Noun",
      V: "Verb",
      T: "Article",
      A: "Adjective",
      P: "Personal Pronoun",
      R: "Relative Pronoun",
      C: "Reciprocal Pronoun",
      D: "Demonstrative Pronoun",
      K: "Correlative Pronoun",
      I: "Interrogative Pronoun",
      X: "Indefinite Pronoun",
      Q: "Correlative/Interrogative Pronoun",
      F: "Reflexive Pronoun",
      S: "Possessive Pronoun",
      CONJ: "Conjunction",
      COND: "Conditional",
      ADV: "Adverb",
      PREP: "Preposition",
      PRT: "Particle",
      INJ: "Interjection",
      HEB: "Hebrew",
      ARAM: "Aramaic"
    };

    // Parts of speech that use person+case+number format (like personal pronouns)
    this._personPronounTypes = new Set(['P', 'F', 'S']);
    // Parts of speech that use case+number+gender format (like nouns)
    this._declensionPronounTypes = new Set(['R', 'C', 'D', 'K', 'I', 'X', 'Q']);

    this.case = {
      N: "Nominative",
      G: "Genitive",
      D: "Dative",
      A: "Accusative",
      V: "Vocative"
    };

    this.number = {
      S: "Singular",
      P: "Plural"
    };

    this.gender = {
      M: "Masculine",
      F: "Feminine",
      N: "Neuter"
    };

    this.tense = {
      P: "Present",
      I: "Imperfect",
      F: "Future",
      A: "Aorist",
      R: "Perfect",
      L: "Pluperfect"
    };

    this.voice = {
      A: "Active",
      M: "Middle",
      P: "Passive",
      E: "Middle/Passive",
      D: "Middle Deponent",
      O: "Passive Deponent",
      N: "Middle/Passive Deponent",
      Q: "Impersonal Active",
      X: "No Voice"
    };

    this.mood = {
      I: "Indicative",
      S: "Subjunctive",
      O: "Optative",
      M: "Imperative",
      N: "Infinitive",
      P: "Participle"
    };

    this.person = {
      "1": "1st Person",
      "2": "2nd Person",
      "3": "3rd Person"
    };
  }

  parse(code) {
    const result = {
      original: code,
      partOfSpeech: null,
      morphology: {},
      readable: ""
    };

    if (!code) return result;

    const parts = code.split("-");
    const posCode = parts[0];
    const morph = parts[1] || null;
    const extraMorph = parts[2] || null;

    result.partOfSpeech = this.partsOfSpeech[posCode] || posCode;

    if (!morph) {
      result.readable = result.partOfSpeech;
      return result;
    }

    let chars = morph.split("");

    if (posCode === 'V') {
      // Handle second-form tenses: 2A (Second Aorist), 2F, 2P, 2L
      let secondForm = false;
      if (chars[0] === '2') {
        secondForm = true;
        chars = chars.slice(1);
      }

      // Verb morphology: tense-voice-mood then either person+number or case+number+gender (participles)
      let tenseName = this.tense[chars[0]];
      if (secondForm && tenseName) {
        tenseName = "Second " + tenseName;
      }
      result.morphology.tense = tenseName;
      result.morphology.voice = this.voice[chars[1]];
      result.morphology.mood = this.mood[chars[2]];

      if (chars[2] === 'P' && extraMorph) {
        // Participle with extra segment: V-PAP-NSM
        const decl = extraMorph.split("");
        if (decl[0]) result.morphology.case = this.case[decl[0]];
        if (decl[1]) result.morphology.number = this.number[decl[1]];
        if (decl[2]) result.morphology.gender = this.gender[decl[2]];
      } else if (chars[2] !== 'N' && chars.length >= 5) {
        // Finite verb: tense+voice+mood+person+number (e.g. V-PAI3S)
        result.morphology.person = this.person[chars[3]];
        result.morphology.number = this.number[chars[4]];
      } else if (chars[2] !== 'N' && extraMorph) {
        // Finite verb with extra segment: V-PAI-3S
        const extra = extraMorph.split("");
        if (extra[0]) result.morphology.person = this.person[extra[0]];
        if (extra[1]) result.morphology.number = this.number[extra[1]];
      }
      // Infinitive (mood=N): only tense+voice+mood, no further fields
    } else if (this._personPronounTypes.has(posCode) && chars.length >= 1 && this.person[chars[0]]) {
      // Personal/Reflexive/Possessive pronouns with person: person+case+number[+gender]
      // e.g. P-1GS, F-3ASM, S-1NPM
      result.morphology.person = this.person[chars[0]];
      if (chars[1]) result.morphology.case = this.case[chars[1]];
      if (chars[2]) result.morphology.number = this.number[chars[2]];
      if (chars[3]) result.morphology.gender = this.gender[chars[3]];
    } else if (this._declensionPronounTypes.has(posCode) && chars.length >= 3) {
      // Relative/Demonstrative/Reciprocal/Interrogative/Correlative/Indefinite pronouns: case+number+gender
      // e.g. R-NSM, D-ASF, I-ASN
      result.morphology.case = this.case[chars[0]];
      result.morphology.number = this.number[chars[1]];
      result.morphology.gender = this.gender[chars[2]];
    } else if (posCode === 'PRT' && morph) {
      // Particle suffixes: PRT-N (Negative), PRT-I (Interrogative)
      if (morph === 'N') result.morphology.type = 'Negative';
      else if (morph === 'I') result.morphology.type = 'Interrogative';
    } else if (chars.length >= 3) {
      // Nouns / articles / adjectives: case+number+gender
      result.morphology.case = this.case[chars[0]];
      result.morphology.number = this.number[chars[1]];
      result.morphology.gender = this.gender[chars[2]];

      // Comparative/superlative suffix for adjectives
      if (posCode === 'A') {
        var degreeChar = chars[3] || (extraMorph ? extraMorph[0] : null);
        if (degreeChar === 'C') result.morphology.degree = 'Comparative';
        if (degreeChar === 'S') result.morphology.degree = 'Superlative';
      }
    }

    result.readable = this.toReadable(result);

    return result;
  }

  toReadable(parsed) {
    const parts = [];

    if (parsed.partOfSpeech) {
      parts.push(parsed.partOfSpeech);
    }

    Object.values(parsed.morphology).forEach(v => {
      if (v) parts.push(v);
    });

    return parts.join(" · ");
  }
}

module.exports = GreekMorphologyParser;
