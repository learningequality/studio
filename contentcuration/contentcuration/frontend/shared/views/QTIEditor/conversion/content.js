import { ContentLevel } from '../constants';
import { getContentHTML, parseHTMLBody } from '../serialization/xml';
import { hasRichTextContent } from 'shared/views/TipTapEditor/TipTapEditor/utils/comparisonKey';

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
function toPlainText(content) {
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
function escapeText(text) {
  const body = parseHTMLBody('');
  body.textContent = text ?? '';
  return getContentHTML(body);
}

/**
 * Whether a piece of content says anything, read at its contentLevel: plain text by its trimmed
 * text, HTML the way `hasRichTextContent` reads it, so an image or a formula counts.
 *
 * @param {string|null|undefined} content
 * @param {string} contentLevel - The ContentLevel it is at
 * @returns {boolean}
 */
export function hasContent(content, contentLevel) {
  if (contentLevel === ContentLevel.PLAIN) {
    return Boolean(content?.trim());
  }
  return hasRichTextContent(content);
}

/**
 * Move a piece of content to the level a field can hold. Going down loses whatever the
 * lower level cannot hold, and `lost` says whether anything was. Going up loses nothing:
 * plain text becomes escaped HTML, in a paragraph when the field holds blocks.
 *
 * @param {string} content
 * @param {string} from - The ContentLevel the content is at
 * @param {string} to - The ContentLevel of the field it moves to
 * @returns {{ content: string, lost: boolean }}
 */
export function changeContentLevel(content, from, to) {
  if (from === to) {
    return { content, lost: false };
  }
  if (to === ContentLevel.PLAIN) {
    const { text, lost } = toPlainText(content);
    return { content: text, lost };
  }
  if (from === ContentLevel.PLAIN) {
    const html = escapeText(content.trim());
    const wrapped = to === ContentLevel.RICH && html ? `<p>${html}</p>` : html;
    return { content: wrapped, lost: false };
  }
  // Rich and inline content never meet: no question type family holds both.
  throw new Error(`No conversion from ${from} to ${to} content`);
}
