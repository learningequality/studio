/**
 * What the item's rich text editors hold, and whether any of it says anything.
 *
 * Every TipTap editor in this editor — a prompt, a choice, an ordering item, a hint —
 * holds an HTML fragment, and such a fragment is empty in more ways than an empty
 * string: a `<p></p>` the author opened and never typed into, a paragraph holding
 * nothing but `&nbsp;`.
 *
 * It can also say something without saying it in words. An image, or a formula from the
 * editor's own formula button, is the whole content — a converted legacy question often
 * asks its question entirely in a picture. Reading only the text would call those empty,
 * dropping a hint on the next save and failing a question that has nothing wrong with it.
 */

import { QTISanitizer } from '../serialization/qti/QTISanitizer';
import { getContentHTML, parseHTMLBody, parseXML } from '../serialization/xml';

/**
 * Markup that is content in its own right, with no text to find.
 *
 * A formula is authored as the `data-latex` span the editor's Math node round-trips, and
 * only becomes MathML when the item is published — so both forms count, the item being
 * read here having come from either side of that.
 */
const EMBEDDED_MEDIA = 'img, math, svg, span[data-latex]';

/**
 * The fragment's visible text.
 *
 * Parsed rather than pattern-stripped, so entities are decoded — `&nbsp;` is whitespace
 * the trim removes, not the literal six characters a `/<[^>]*>/g` strip leaves behind.
 *
 * @param {string} content
 * @returns {string}
 */
function toText(content) {
  return QTISanitizer.stripTags(content ?? '').trim();
}

/**
 * Whether a rich text fragment holds anything worth keeping.
 *
 * @param {string} content - HTML fragment from a TipTap editor
 * @returns {boolean}
 */
export function hasRichTextContent(content) {
  return (
    toText(content).length > 0 ||
    Boolean(parseXML(content ?? '', 'text/html').querySelector(EMBEDDED_MEDIA))
  );
}

/**
 * Elements that end a line of text. Their content is kept apart from the next block's when
 * the fragment is read as one line, so `<p>a</p><p>b</p>` reads `a b`, not `ab`.
 */
const LINE_BREAKING = new Set([
  'p',
  'div',
  'br',
  'li',
  'ul',
  'ol',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'pre',
  'table',
  'tr',
  'td',
  'th',
]);

function lineText(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.nodeValue;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }
  const text = [...node.childNodes].map(lineText).join('');
  return LINE_BREAKING.has(node.localName) ? ` ${text} ` : text;
}

/**
 * A rich text fragment as one line of plain text, for a field that holds text only, such
 * as a text entry answer or an inline choice option.
 *
 * Anything plain text cannot hold is dropped: formatting, images, formulas, and the breaks
 * between paragraphs. `lost` says whether there was any, so the author can be told before
 * it goes. A single paragraph of text loses nothing, since a plain text field shows it the
 * same way.
 *
 * @param {string} content - HTML fragment from a TipTap editor
 * @returns {{ text: string, lost: boolean }}
 */
export function toPlainText(content) {
  const body = parseHTMLBody(content);
  body.querySelectorAll('script, style').forEach(el => el.remove());
  const elements = [...body.querySelectorAll('*')];
  // Loose text beside the paragraphs is a line of its own; empty paragraphs are none.
  const hasLooseText = [...body.childNodes].some(
    node => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim(),
  );
  const lines = elements.filter(el => el.textContent.trim()).length + (hasLooseText ? 1 : 0);
  const lost = elements.some(el => el.localName !== 'p') || lines > 1;
  const text = lineText(body).replace(/\s+/g, ' ').trim();
  return { text, lost };
}

/**
 * Plain text as HTML, escaped, with no element around it.
 *
 * @param {string} text
 * @returns {string}
 */
export function escapeText(text) {
  const body = parseHTMLBody('');
  body.textContent = text ?? '';
  return getContentHTML(body);
}
