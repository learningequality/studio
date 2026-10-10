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
import { hasRichTextContent } from '../utils/richText';
import {
  attributesOf,
  contentChildrenOf,
  getContentHTML,
  hasNonNamespaceAttributes,
  isChildElement,
} from './xml';

/** The catalog this editor writes hints into. */
export const HINT_CATALOG_ID = 'kolibri-hints';

/** The support value that marks a card as a hint. Mirrors qti/catalog.py. */
export const HINT_SUPPORT = 'ext:kolibri-hint';

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
      content: htmlContent ? getContentHTML(htmlContent).trim() : '',
    };
  });
}

/**
 * Whether this is a hint card in the shape the editor writes, which parseHints reads in full.
 *
 * @param {Node} card
 * @returns {boolean}
 */
function isHintCard(card) {
  if (!isChildElement(card, 'qti-card')) {
    return false;
  }
  const attrs = attributesOf(card);
  const [content, ...rest] = contentChildrenOf(card);
  return (
    attrs.length === 1 &&
    attrs[0].name === 'support' &&
    attrs[0].value === HINT_SUPPORT &&
    !rest.length &&
    (!content ||
      (isChildElement(content, 'qti-html-content') && !hasNonNamespaceAttributes(content)))
  );
}

/**
 * Whether the item's `<qti-catalog-info>` holds only the hint catalog, with only cards
 * parseHints reads in full, so an edit that rewrites it drops nothing. Change it with
 * parseHints.
 *
 * @param {Element} catalogInfo
 * @returns {boolean}
 */
export function holdsOnlyHints(catalogInfo) {
  return (
    !hasNonNamespaceAttributes(catalogInfo) &&
    contentChildrenOf(catalogInfo).every(
      catalog =>
        isChildElement(catalog, 'qti-catalog') &&
        attributesOf(catalog).length === 1 &&
        catalog.getAttribute('id') === HINT_CATALOG_ID &&
        contentChildrenOf(catalog).every(isHintCard),
    )
  );
}

/**
 * Whether a hint holds anything worth writing.
 *
 * An empty card is schema-valid but says nothing, so a hint the author has not written
 * yet stays in the editor without reaching the item — the same log-and-skip rule the
 * legacy conversion applies to a hint with no text.
 *
 * @param {{ content: string }} hint
 * @returns {boolean}
 */
export function hintHasContent(hint) {
  return hasRichTextContent(hint.content);
}
