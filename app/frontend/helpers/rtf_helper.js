/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
   See the GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

/**
 * This module offers RTF to HTML conversion functionality
 * @module rtf_helper
 * @category Helper
 */

module.exports.rtfToHtml = function(rtf) {
  if (!rtf) return "";

  // Basic cleanup: remove newlines as RTF ignores them (unless escaped)
  rtf = rtf.replace(/(\r\n|\n|\r)/gm, "");

  let stack = [];
  let state = { 
    bold: false, 
    italic: false, 
    underline: false,
    ignore: false
  };
  let output = "";
  let buffer = "";
  let alignDivOpen = false;

  // Pattern to match common HTML tags (opening, closing, self-closing with optional attributes)
  const htmlTagPattern = /<\/?(?:a|b|i|u|p|br|div|span|strong|em|blockquote|ul|ol|li|h[1-6]|table|tr|td|th|thead|tbody|font|sub|sup|hr)(?:\s[^>]*)?\/?>/gi;

  const escapeHtml = (text) => {
    // Split by HTML tags, preserving the tags in the result
    let parts = text.split(htmlTagPattern);
    let tags = text.match(htmlTagPattern) || [];

    let result = '';
    for (let j = 0; j < parts.length; j++) {
      // Escape the non-tag part
      result += parts[j]
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

      // Append the preserved HTML tag if it exists
      if (j < tags.length) {
        result += tags[j];
      }
    }

    return result;
  };

  const flush = () => {
    if (buffer.length > 0) {
      if (!state.ignore) {
        let content = escapeHtml(buffer);
        if (state.bold) content = `<b>${content}</b>`;
        if (state.italic) content = `<i>${content}</i>`;
        if (state.underline) content = `<u>${content}</u>`;
        output += content;
      }
      buffer = "";
    }
  };

  for (let i = 0; i < rtf.length; i++) {
    let char = rtf[i];

    if (char === '{') {
      flush();
      stack.push({ ...state });
    } else if (char === '}') {
      flush();
      if (stack.length > 0) state = stack.pop();
    } else if (char === '\\') {
      // Parse control word
      let match = rtf.substring(i + 1).match(/^([a-z]+)(-?\d*) ?/i);
      let symbolMatch = rtf.substring(i + 1).match(/^([^\w\s])/); 

      if (match) {
        let command = match[1];
        let param = match[2];
        let fullMatch = match[0];
        
        i += fullMatch.length;

        if (state.ignore) {
          if (command === 'bin') {
            // Binary data, skip N bytes
            // Not implemented for simplicity, but good to know
          }
          continue;
        }

        switch (command) {
          case 'b':
            flush();
            state.bold = (param !== '0');
            break;
          case 'i':
            flush();
            state.italic = (param !== '0');
            break;
          case 'ul':
          case 'ulc': 
            flush();
            state.underline = (param !== '0' && param !== 'none');
            break;
          case 'u':
            if (param !== '') {
              let code = parseInt(param);
              if (code < 0) code += 65536;
              buffer += String.fromCharCode(code);
              // Skip replacement char (usually '?')
              if (i + 1 < rtf.length && rtf[i + 1] !== '\\' && rtf[i + 1] !== '{' && rtf[i + 1] !== '}') {
                 i++; 
              }
            }
            break;
          case 'par':
            flush();
            output += "<br>";
            break;
          case 'pard':
            flush();
            if (alignDivOpen) {
              output += "</div>";
              alignDivOpen = false;
            }
            break;
          case 'qc':
            flush();
            if (!alignDivOpen) {
              output += "<div style='text-align: center'>";
              alignDivOpen = true;
            } else {
              // Already open, maybe close and reopen? 
              // Or just assume nested or redundant.
              // If we are already centered, do nothing.
              // If we were right aligned (not implemented yet), we'd need to switch.
              // For now, just ensure we are in a div.
            }
            break;
          case 'tab':
            flush();
            buffer += "&nbsp;&nbsp;&nbsp;&nbsp;";
            break;
          case 'rtf':
          case 'ansi':
          case 'deff':
          case 'fonttbl':
          case 'colortbl':
          case 'stylesheet':
          case 'info':
            // Header stuff
            break;
          default:
            // Ignore unknown
            break;
        }
      } else if (symbolMatch) {
        let symbol = symbolMatch[1];
        i += symbol.length;
        
        if (symbol === "'") {
          let hex = rtf.substring(i + 1, i + 3);
          if (/^[0-9a-fA-F]{2}$/.test(hex)) {
            buffer += String.fromCharCode(parseInt(hex, 16));
            i += 2;
          }
        } else if (symbol === "~") {
          buffer += "&nbsp;";
        } else if (symbol === "_") {
          buffer += "-"; 
        } else if (symbol === "*") {
          // Destination group to ignore
          if (stack.length > 0) {
             state.ignore = true;
          }
        } else {
          buffer += symbol;
        }
      }
    } else {
      if (!state.ignore) {
        buffer += char;
      }
    }
  }
  
  flush();
  
  // Close any dangling divs
  if (alignDivOpen) {
    output += "</div>";
  }

  return output;
};
