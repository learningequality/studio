import { ContentLevel } from '../constants';
import { escapeText, hasRichTextContent, toPlainText } from '../utils/richText';

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
