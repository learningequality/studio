/**
 * Hints, which QTI has no element of its own for.
 *
 * A legacy question's hints are carried in the item's `<qti-catalog-info>` — dormant
 * content the delivery engine never renders on its own — as cards tagged with a Kolibri
 * support value.
 *
 *   <qti-catalog-info>
 *     <qti-catalog id="kolibri-hints">
 *       <qti-card support="ext:kolibri-hint">
 *         <qti-html-content><p>Try halving it first</p></qti-html-content>
 *       </qti-card>
 *     </qti-catalog>
 *   </qti-catalog-info>
 */

import { generateRandomSlug } from '../utils/generateRandomSlug';
import { stripTags } from '../utils/stripTags';

/** The catalog this editor writes hints into. */
export const HINT_CATALOG_ID = 'kolibri-hints';

/** The support value that marks a card as a hint. Mirrors qti/catalog.py. */
export const HINT_SUPPORT = 'ext:kolibri-hint';

/**
 * The item's own namespace, which its content inherits from the root and therefore does
 * not declare. Serializing a subtree on its own re-declares it on every top-level
 * element, so reading a card's markup back out of the document reintroduces a
 * declaration that was never in the stored XML. Dropped by value rather than by pattern,
 * so a foreign namespace a hint legitimately carries — MathML from the formula button —
 * is left alone.
 */
const QTI_NAMESPACE_DECLARATION = / xmlns="http:\/\/www\.imsglobal\.org\/xsd\/imsqtiasi_v3p0"/g;

/**
 * Read the item's hints, in document order.
 *
 * Cards are matched on their support value rather than the catalog they sit in, the same
 * way the publish-side derivation does — a catalog id is a name, the support value is the
 * contract. `id` is generated here for list keys and is not part of the XML.
 *
 * @param {Document} doc - Parsed assessment item document
 * @returns {Array<{ id: string, content: string }>}
 */
export function parseHints(doc) {
  const cards = [...doc.querySelectorAll(`qti-card[support="${HINT_SUPPORT}"]`)];

  return cards.map(card => {
    const htmlContent = card.querySelector('qti-html-content');
    return {
      id: generateRandomSlug('hint'),
      // Pretty-printed XML puts the card's indentation inside the element, and the
      // editor would otherwise open on a stray blank line.
      content: htmlContent
        ? htmlContent.innerHTML.replace(QTI_NAMESPACE_DECLARATION, '').trim()
        : '',
    };
  });
}

/** Markup that is content in its own right, with no text to find. */
const EMBEDDED_MEDIA = /<(img|math|svg)\b/i;

/**
 * Whether a hint holds anything worth writing.
 *
 * An empty card is schema-valid but says nothing, so a hint the author has not written
 * yet stays in the editor without reaching the item — the same log-and-skip rule the
 * legacy conversion applies to a hint with no text.
 *
 * A hint can say something without saying it in words: an image, or a formula from the
 * editor's own formula button, is the whole hint. Reading only the text would drop those
 * on the next save, and show them as the empty-hint placeholder in the meantime.
 *
 * @param {{ content: string }} hint
 * @returns {boolean}
 */
export function hintHasContent(hint) {
  const content = hint.content || '';
  const text = stripTags(content).replace(/&nbsp;/g, ' ');
  return text.trim().length > 0 || EMBEDDED_MEDIA.test(content);
}
