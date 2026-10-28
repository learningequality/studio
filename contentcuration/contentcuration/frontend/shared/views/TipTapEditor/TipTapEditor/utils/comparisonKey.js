import omit from 'lodash/omit';
import { getSchema } from '@tiptap/core';
// The resolver does not read package `exports` subpaths.
// eslint-disable-next-line import/no-unresolved
import { DOMParser as PMDOMParser } from '@tiptap/pm/model';
import { editorExtensions } from '../extensions';

// The full schema, so inline and block content of the same text read the same.
const schema = getSchema(editorExtensions());
const parser = PMDOMParser.fromSchema(schema);

// Media the schema has no node for, so parsing would drop it.
const UNPARSED_MEDIA = 'svg, math';
// Marks that change what text says.
const SCRIPTS = ['superscript', 'subscript'];

/**
 * Markup that is content in its own right, with no text to find.
 *
 * A formula is authored as the `data-latex` span the editor's Math node round-trips, and
 * only becomes MathML when the item is published — so both forms count, the item being
 * read here having come from either side of that.
 */
const EMBEDDED_MEDIA = 'img, math, svg, span[data-latex]';

function parseHTML(html) {
  return new DOMParser().parseFromString(html ?? '', 'text/html');
}

function toText(document) {
  // Remove script and style elements entirely — we do NOT want their text content.
  document.querySelectorAll('script, style').forEach(el => el.remove());
  return document.body.textContent.trim();
}

function hasContent(document) {
  return Boolean(document.querySelector(EMBEDDED_MEDIA)) || toText(document).length > 0;
}

/**
 * Whether a rich text fragment holds anything worth keeping.
 *
 * A fragment is empty in more ways than an empty string: a `<p></p>` the author opened
 * and never typed into, a paragraph holding nothing but `&nbsp;`.
 *
 * It can also say something without saying it in words. An image, or a formula from the
 * editor's own formula button, is the whole content — a converted legacy question often
 * asks its question entirely in a picture. Reading only the text would call those empty,
 * dropping a hint on the next save and failing a question that has nothing wrong with it.
 *
 * @param {string} content - HTML fragment from a TipTap editor
 * @returns {boolean}
 */
export function hasRichTextContent(content) {
  return hasContent(parseHTML(content));
}

/**
 * A key two fragments can be compared on to tell whether they say the same thing.
 *
 * Its text, however marked up except its sub/superscripts, and each formula, image,
 * SVG, MathML and line break where it stands. Read as TipTap saves it, so its
 * re-render keys the same, unless it has SVG or MathML, which TipTap drops.
 *
 * @param {string} html - HTML fragment from a TipTap editor
 * @returns {string} '' for a fragment without rich text content
 */
export function richTextComparisonKey(html) {
  const document = parseHTML(html);
  if (!hasContent(document)) return '';
  // A formula stands in for each, so parsing keeps its place. HTML parsing turns NUL
  // into U+FFFD, so no stored formula has this LaTeX.
  const unparsed = new Map();
  for (const element of document.body.querySelectorAll(UNPARSED_MEDIA)) {
    const latex = `\0${unparsed.size}`;
    unparsed.set(latex, ['html', element.outerHTML.replace(/\s+/g, ' ').replace(/>\s+</g, '><')]);
    const placeholder = document.createElement('span');
    placeholder.setAttribute('data-latex', latex);
    element.replaceWith(placeholder);
  }
  const parts = [];
  let text = '';
  let script = null;
  // Whitespace at a line's edges is not seen, nor kept by parsing TipTap's output, e.g.
  // after an image split out of a paragraph.
  let lineStart = false;
  // One marker however the lines break, and none before the first or after the last.
  let lineBreak = false;
  const endText = () => {
    if (text) parts.push(script ? [script, text] : text);
    text = '';
  };
  const startContent = () => {
    if (lineBreak) {
      endText();
      parts.push(['br']);
      lineBreak = false;
    }
    lineStart = false;
  };
  const breakLine = () => {
    lineBreak = lineBreak || Boolean(text || parts.length);
  };
  const pushAtom = part => {
    startContent();
    endText();
    parts.push(part);
  };
  const read = node => {
    if (node.isText) {
      const value = lineStart ? node.text.trimStart() : node.text;
      if (!value) return;
      startContent();
      const nodeScript =
        node.marks.find(mark => SCRIPTS.includes(mark.type.name))?.type.name ?? null;
      if (nodeScript !== script) {
        endText();
        script = nodeScript;
      }
      text += value;
    } else if (node.type.name === 'math') {
      pushAtom(unparsed.get(node.attrs.latex) ?? ['latex', node.attrs.latex]);
    } else if (node.type.name === 'image') {
      // A block, so it starts a line.
      breakLine();
      // Not where an upload is saved, nor how it is laid out.
      pushAtom(['img', omit(node.attrs, ['permanentSrc', 'width', 'height', 'textAlign'])]);
    } else if (node.isTextblock || node.type.name === 'hardBreak') {
      text = text.trimEnd();
      breakLine();
      lineStart = true;
      node.forEach(read);
      text = text.trimEnd();
    } else {
      node.forEach(read);
    }
  };
  read(parser.parse(document.body));
  endText();
  return JSON.stringify(parts);
}
