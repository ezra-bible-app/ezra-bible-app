/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2021 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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


const docx = require('docx');
const marked = require('marked');
const { decodeEntities } = require('../../helpers/ezra_helper.js');
const { parseHTML } = require('../../helpers/ezra_helper.js');

module.exports.getPageProps = function() {
  return {
    page: {
      margin: {
        top: docx.convertMillimetersToTwip(10),
        right: docx.convertMillimetersToTwip(10),
        bottom: docx.convertMillimetersToTwip(10),
        left: docx.convertMillimetersToTwip(10),
      },
    },
  };
};

module.exports.getNumberingConfig = function() {
  return {
    config: [{
      reference: "custom-bullets",
      levels: [
        {
          level: 0,
          format: docx.LevelFormat.BULLET,
          text: "•",
          alignment: docx.AlignmentType.LEFT,
          style: {
            paragraph: {
              indent: { left: 300, hanging: 150 },
            },
          },
        },
      ],
    }, {
      reference: "custom-numbers",
      levels: [
        {
          level: 0,
          format: docx.LevelFormat.DECIMAL,
          text: "%1.",
          alignment: docx.AlignmentType.START,
          style: {
            paragraph: {
              indent: { left: 300, hanging: 250 },
            },
          },
        },
      ]
    }]
  };
};

module.exports.getDocStyles = function() {
  return {
    default: {
      title: {
        run: {
          size: 48,
          allCaps: true,
        },
        paragraph: {
          alignment: docx.AlignmentType.CENTER,
          spacing: {
            before: docx.convertMillimetersToTwip(7),
            after: docx.convertMillimetersToTwip(14),
          }
        }
      },
      heading1: {
        run: {
          size: 30,
        },
        paragraph: {
          spacing: {
            before: docx.convertMillimetersToTwip(10),
            after: docx.convertMillimetersToTwip(5),
          },
        },
      },
      heading2: {
        run: {
          size: 24,
          allCaps: true,
          bold: true,
        },
        paragraph: {
          spacing: {
            before: docx.convertMillimetersToTwip(5),
            after: docx.convertMillimetersToTwip(3),
          },
        },
      },
      heading3: {
        run: {
          size: 18,
          allCaps: true,
        },
        paragraph: {
          spacing: {
            before: docx.convertMillimetersToTwip(5),
            after: docx.convertMillimetersToTwip(3),
          },
        },
      },
      heading4: {
        run: {
          size: 14,
          bold: true,
        },
        paragraph: {
          spacing: {
            before: docx.convertMillimetersToTwip(3),
            after: docx.convertMillimetersToTwip(1),
          },
        },
      },
      listParagraph: {
        run: {
          color: "FF0000",
        },
      },
    },
    paragraphStyles: [
      {
        id: "notes",
        name: "Notes",
        basedOn: "Normal",
        next: "Notes",
        quickFormat: true,
        run: {
          color: "2779AA",
        },
        paragraph: {
        },
      },
      {
        id: "blockquote",
        name: "BlockQuote",
        basedOn: "Notes",
        next: "Notes",
        quickFormat: true,
        run: {
          size: 22,
        },
        paragraph: {
          indent: {
            left: docx.convertMillimetersToTwip(7),
          },
          spacing: { before: docx.convertMillimetersToTwip(3), after: docx.convertMillimetersToTwip(3) },
          border: {
            left: {
              color: "BBBBBB",
              space: 10,
              value: "single",
              size: 12
            }
          }
        },
      },
      {
        id: "page-footer",
        name: "PageFooter",
        basedOn: "Notes",
        next: "PageFooter",
        quickFormat: true,
        run: {
          color: '888888',
        },
      },
    ],
  };
};

module.exports.addBibleTranslationInfo = async function() {
  const bibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
  const swordHelper = require('../../helpers/sword_module_helper.js');

  const license = await swordHelper.getModuleLicense(bibleTranslationId);
  const copyright = await swordHelper.getModuleCopyright(bibleTranslationId);

  const children = [
    new docx.TextRun(`${i18n.t("general.scripture-quote-from")} `),
    new docx.TextRun({ text: await swordHelper.getModuleFullName(bibleTranslationId), bold: true }),
    license ? new docx.TextRun(` (${license})`) : undefined,
    copyright ? new docx.TextRun({ text: copyright, break: 1 }) : undefined
  ];

  return {
    default: new docx.Footer({
      children: [
        new docx.Paragraph({
          children,
          style: 'page-footer',
        })
      ]
    })
  };
};

module.exports.markdownToDocx = function(markdown, style=undefined) {
  var paragraphs = [];
  var currentParagraphText = [];
  var isOrderedList = false;
  var isBlockquote = false;

  convertMarkDownTokens(marked.lexer(markdown));

  // https://marked.js.org/using_pro#lexer
  function convertMarkDownTokens(tokenArr, currentOptions={}) {
    for (const token of tokenArr) {
      let textOptions = {};
      switch (token.type) { // check for inline types
        case 'em':
          textOptions.italics = true;
          break;
        case 'strong':
          textOptions.bold = true;
          break;
        case 'codespan':
          textOptions.highlight = 'yellow';
          break;
        case 'link':
          currentParagraphText.push(new docx.ExternalHyperlink({ 
            child: new docx.TextRun({text: token.text,  style: 'Hyperlink'}),
            link: token.href
          }));
          continue;
        case 'list':
          isOrderedList = token.ordered;
          break;
        case 'blockquote':
          isBlockquote = true;  
      }

      if (token.tokens) {
        convertMarkDownTokens(token.tokens, { ...currentOptions, ...textOptions });
      } else if (token.items) {
        convertMarkDownTokens(token.items, { ...currentOptions, ...textOptions });  
      } else if (token.text) {
        currentParagraphText.push(new docx.TextRun({text: decodeEntities(token.text), ...currentOptions, ...textOptions }));
        continue;
      }

      switch (token.type) { // check for block types
        case 'paragraph':
          paragraphs.push(new docx.Paragraph({children: currentParagraphText, style: isBlockquote ? 'blockquote' : style}));
          currentParagraphText = [];
          break;
        case 'heading':
          paragraphs.push(new docx.Paragraph({
            children: currentParagraphText,
            heading: docx.HeadingLevel[`HEADING_${token.depth}`],
          }));
          currentParagraphText = [];
          break;
        case 'blockquote':
          isBlockquote = false;
          break;
        case 'list_item': 
          paragraphs.push(new docx.Paragraph({
            children: currentParagraphText,
            style,
            numbering: {
              reference: isOrderedList ? 'custom-numbers' : 'custom-bullets',
              level: 0
            }
          }));
          currentParagraphText = [];
          break;
        case 'hr':
          paragraphs.push(new docx.Paragraph({
            text: "",
            border: {
              bottom: {
                color: "999999",
                space: 1,
                value: "single",
                size: 6,
              },
            },
            spacing: { after: 150 },
          }));
          break;
        case 'space':
          paragraphs.push(new docx.Paragraph(""));
          break;
        case 'link':
          paragraphs.push(new docx.Paragraph({
            children: [new docx.ExternalHyperlink({ 
              children: currentParagraphText,
              link: token.href
            })]
          }));
          currentParagraphText = [];
          break;
      }
    }
  }

  return paragraphs;
};

module.exports.getTableFromVerseBlock = function(verseBlock, notes) {
  var table = new docx.Table({
    rows: verseBlock.map(verse => {
      const referenceId = `${verse.bibleBookShortTitle.toLowerCase()}-${verse.absoluteVerseNr}`;

      return new docx.TableRow({
        children: [
          new docx.TableCell({
            children: [renderVerse(verse)],
            width: {
              type: docx.WidthType.DXA,
              size: docx.convertMillimetersToTwip(95)
            },
            borders: {
              top: {color: '555555'},
              left: {color: '555555'},
              bottom: {color: '555555'},
              right: {color: '555555'},
            },
          }),
          new docx.TableCell({
            children: notes[referenceId] ? this.markdownToDocx(notes[referenceId].text, 'notes') : [],
            width: {
              type: docx.WidthType.DXA,
              size: docx.convertMillimetersToTwip(95)
            },
            borders: {
              top: {color: '555555'},
              left: {color: '555555'},
              bottom: {color: '555555'},
              right: {color: '555555'},
            },
          })
        ],
        cantSplit: true
      });
    }),
    margins: {
      marginUnitType: docx.WidthType.DXA,
      top: docx.convertMillimetersToTwip(2),
      bottom: docx.convertMillimetersToTwip(2),
      left: docx.convertMillimetersToTwip(2),
      right: docx.convertMillimetersToTwip(2),
    },
    width: {
      type: docx.WidthType.DXA,
      size: docx.convertMillimetersToTwip(190)
    },
    columnWidths: [docx.convertMillimetersToTwip(95), docx.convertMillimetersToTwip(95)],
  });

  return table;
};

function renderVerse(verse) {
  let currentVerseContent = "";
  const fixedContent = verse.content.replace(/<([a-z]+)(\s?[^>]*?)\/>/g, '<$1$2></$1>'); // replace self clothing tags FIXME: Should it be in the NSI?
  const currentVerseNodes = Array.from(parseHTML(fixedContent).childNodes);

  currentVerseContent = currentVerseNodes.reduce((prevContent, currentNode) => {
    // We export everything that is not a DIV
    // DIV elements contain markup that should not be in the word document
    return currentNode.nodeName !== 'DIV' ? prevContent + currentNode.textContent : prevContent;
  }, "");

  return new docx.Paragraph({
    children: [
      new docx.TextRun({text: verse.verseNr, superScript: true}),
      new docx.TextRun(" " + currentVerseContent)
    ]
  });
}