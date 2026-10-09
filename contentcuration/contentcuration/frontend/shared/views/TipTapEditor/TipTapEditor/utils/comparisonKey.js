import omit from 'lodash/omit';
import { getSchema } from '@tiptap/core';
// The resolver does not read package `exports` subpaths.
// eslint-disable-next-line import/no-unresolved
import { DOMParser as PMDOMParser } from '@tiptap/pm/model';
import { editorExtensions } from '../composables/useEditor';

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
 * Read as TipTap saves it, so its re-render of a fragment keys the same: its text,
 * however marked up except its sub/superscripts, and each formula, image, SVG and
 * MathML where it stands.
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
  const endText = () => {
    if (text) parts.push(script ? [script, text] : text);
    text = '';
  };
  const read = node => {
    if (node.isText) {
      const nodeScript =
        node.marks.find(mark => SCRIPTS.includes(mark.type.name))?.type.name ?? null;
      if (nodeScript !== script) {
        endText();
        script = nodeScript;
      }
      const value = lineStart ? node.text.trimStart() : node.text;
      lineStart = lineStart && !value;
      text += value;
    } else if (node.type.name === 'math') {
      endText();
      parts.push(unparsed.get(node.attrs.latex) ?? ['latex', node.attrs.latex]);
      lineStart = false;
    } else if (node.type.name === 'image') {
      endText();
      // Not where an upload is saved, nor the size ImageNodeView writes when it loads.
      parts.push(['img', omit(node.attrs, ['permanentSrc', 'width', 'height'])]);
      lineStart = false;
    } else if (node.isTextblock || node.type.name === 'hardBreak') {
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
