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
 * Parses Packard's Morphological Analysis Codes for Greek OT (Septuagint/LXX) text.
 *
 * These codes are used by the SWORD library's Packard morphology module
 * to tag each word in the Greek Old Testament with grammatical information.
 *
 * Code format: TYPE[-PARSE]
 *   - TYPE (1-3 chars): identifies part of speech and subcategory
 *     Nouns: N, N1, N1A, N1M, N1S, N1T, N2, N2N, N3, N3D-N3W
 *     Verbs: V1-V9, VA, VB, VC, VD, VE, VF, VF2, VF3, VFX, VH, VK, VM, VO, VP, VQ, VS, VT, VV, VX, VZ
 *     Adjectives: A1, A1A, A1B, A1C, A1S, A3, A3E, A3H, A3N, A3U, A3C
 *     Pronouns: RA (Article), RD (Demonstrative), RI (Interrogative/Indefinite),
 *       RP (Personal/Possessive), RR (Relative), RX (Indefinite Relative)
 *     Indeclinables: C (Conjunction), X (Particle), I (Interjection),
 *       M (Indeclinable Number), P (Preposition), D (Adverb)
 *   - PARSE (up to 6 chars): grammatical details
 *     Nouns/Pronouns/Articles: case+number+gender
 *     Adjectives: case+number+gender[+degree]
 *     Verbs (finite): tense+voice+mood+person+number
 *     Verbs (participle): tense+voice+P+case+number+gender
 *     Verbs (infinitive): tense+voice+N
 *
 * Key differences from Robinson:
 *   - Tense: X=Perfect (Robinson: R), Y=Pluperfect (Robinson: L)
 *   - Mood: D=Imperative (Robinson: M)
 *   - Number: D=Dual (not in Robinson)
 *   - Voice: only A/M/P (no deponent voices)
 *
 * Reference:
 *   - Packard morphology spec: https://ccat.sas.upenn.edu/gopher/text/religion/biblical/lxxmorph/*Morph-Coding
 *   - SWORD project Packard module: https://crosswire.org/sword
 */
class PackardGreekMorphologyParser {

  constructor() {
    // Pronoun subtypes (R + second char)
    this._pronounTypes = {
      RA: "Article",
      RD: "Demonstrative Pronoun",
      RI: "Interrogative/Indefinite Pronoun",
      RP: "Personal/Possessive Pronoun",
      RR: "Relative Pronoun",
      RX: "Indefinite Relative Pronoun"
    };

    // Single-char indeclinable POS codes
    this._indeclinables = {
      C: "Conjunction",
      X: "Particle",
      I: "Interjection",
      M: "Indeclinable Number",
      P: "Preposition",
      D: "Adverb"
    };

    this.case = {
      N: "Nominative",
      G: "Genitive",
      D: "Dative",
      A: "Accusative",
      V: "Vocative"
    };

    this.number = {
      S: "Singular",
      D: "Dual",
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
      X: "Perfect",
      Y: "Pluperfect"
    };

    this.voice = {
      A: "Active",
      M: "Middle",
      P: "Passive"
    };

    this.mood = {
      I: "Indicative",
      D: "Imperative",
      S: "Subjunctive",
      O: "Optative",
      N: "Infinitive",
      P: "Participle"
    };

    this.person = {
      "1": "1st Person",
      "2": "2nd Person",
      "3": "3rd Person"
    };
  }

  _resolvePartOfSpeech(typeCode) {
    // Check pronoun subtypes first (RA, RD, RI, RP, RR, RX)
    if (this._pronounTypes[typeCode]) {
      return this._pronounTypes[typeCode];
    }

    // Check indeclinables (C, X, I, M, P, D)
    if (this._indeclinables[typeCode]) {
      return this._indeclinables[typeCode];
    }

    // Broad categories by first character
    var firstChar = typeCode[0];
    if (firstChar === 'N') return "Noun";
    if (firstChar === 'V') return "Verb";
    if (firstChar === 'A') return "Adjective";
    if (firstChar === 'R') return "Pronoun";

    return typeCode;
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
    const typeCode = parts[0];
    const parseCode = parts[1] || null;

    result.partOfSpeech = this._resolvePartOfSpeech(typeCode);

    if (!parseCode) {
      result.readable = result.partOfSpeech;
      return result;
    }

    const chars = parseCode.split("");
    const firstChar = typeCode[0];

    if (firstChar === 'V') {
      // Verb parse: tense+voice+mood[+person+number] or tense+voice+P+case+number+gender
      result.morphology.tense = this.tense[chars[0]];
      result.morphology.voice = this.voice[chars[1]];
      result.morphology.mood = this.mood[chars[2]];

      if (chars[2] === 'P') {
        // Participle: remaining chars are case+number+gender
        if (chars[3]) result.morphology.case = this.case[chars[3]];
        if (chars[4]) result.morphology.number = this.number[chars[4]];
        if (chars[5]) result.morphology.gender = this.gender[chars[5]];
      } else if (chars[2] !== 'N') {
        // Finite verb: person+number
        if (chars[3]) result.morphology.person = this.person[chars[3]];
        if (chars[4]) result.morphology.number = this.number[chars[4]];
      }
      // Infinitive (mood=N): only tense+voice+mood
    } else {
      // Nouns, adjectives, pronouns, articles: case+number+gender
      if (chars[0]) result.morphology.case = this.case[chars[0]];
      if (chars[1]) result.morphology.number = this.number[chars[1]];
      if (chars[2]) result.morphology.gender = this.gender[chars[2]];

      // Adjective degree (4th char)
      if (firstChar === 'A' && chars[3]) {
        if (chars[3] === 'C') result.morphology.degree = 'Comparative';
        if (chars[3] === 'S') result.morphology.degree = 'Superlative';
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

module.exports = PackardGreekMorphologyParser;
