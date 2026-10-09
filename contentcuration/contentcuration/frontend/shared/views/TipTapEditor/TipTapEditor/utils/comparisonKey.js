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
 * A key two fragments can be compared on to tell whether they say the same thing.
 *
 * Its text, however marked up except its sub/superscripts, and each formula, image,
 * SVG, MathML and line break where it stands. Read as TipTap saves it, so its
 * re-render keys the same, unless it has SVG or MathML, which TipTap drops.
 *
 * @param {string} html - HTML fragment from a TipTap editor
 * @returns {string}
 */
export function richTextComparisonKey(html) {
  const document = new DOMParser().parseFromString(html ?? '', 'text/html');
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
