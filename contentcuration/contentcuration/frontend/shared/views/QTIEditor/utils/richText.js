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

/**
 * Markup that is content in its own right, with no text to find.
 *
 * A formula is authored as the `data-latex` span the editor's Math node round-trips, and
 * only becomes MathML when the item is published — so both forms count, the item being
 * read here having come from either side of that.
 */
const EMBEDDED_MEDIA = /<(img|math|svg)\b|<span[^>]*\sdata-latex=/i;

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
  return toText(content).length > 0 || EMBEDDED_MEDIA.test(content ?? '');
}

/**
 * A key two fragments can be compared on to tell whether they say the same thing.
 *
 * Text is what an author reads, so text is what duplicates are judged on — two choices
 * that read the same are the same choice however differently they are marked up. A
 * fragment with no text has only its markup to go on, which keeps two different images
 * apart while still catching the same image offered twice — read back out of stored XML
 * it arrives pretty-printed, so the markup is compared with its layout normalised away.
 *
 * Only meaningful for a fragment that `hasRichTextContent`; an empty one keys to ''.
 *
 * @param {string} content - HTML fragment from a TipTap editor
 * @returns {string}
 */
export function richTextComparisonKey(content) {
  return toText(content) || (content ?? '').replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
}
