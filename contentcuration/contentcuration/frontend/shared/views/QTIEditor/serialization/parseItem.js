import { QTI_INTERACTION_TAGS } from '../constants';
import { isInlineInteraction } from '../interactions/descriptors';
import { parseHints } from './hints';
import { parseXML } from './xml';

const serializer = new XMLSerializer();

/**
 * Parses a raw QTI XML string into the structured ItemModel.
 *
 * Each block interaction in the item body becomes one entry in `interactions`.
 * A response declaration belongs to an interaction when the declaration's
 * `identifier` matches the interaction's `response-identifier` attribute.
 *
 * Inline interactions of one type share one entry, holding all their declarations
 * in body order. Its `bodyXml` is the serialized `<qti-item-body>` rather than an
 * interaction element, so its parse() can recover prompt content from body siblings.
 *
 * Hints belong to the item rather than to any one interaction, so they come back
 * alongside `interactions` rather than inside them. So does the body: an item can carry
 * content with no interaction this editor recognises, and a caller that reassembles the
 * item needs its body whether or not it found one.
 *
 * @param {string} rawData - Raw QTI XML string (the full assessment item XML)
 * @returns {{
 *   identifier: string,
 *   title: string,
 *   language: string,
 *   itemBodyXml: string,
 *   interactions: Array<{ bodyXml: string, responseDeclarations: string[] }>,
 *   hints: Array<{ id: string, content: string }>
 * }}
 */
export function parseItem(rawData) {
  const doc = parseXML(rawData);

  const root = doc.querySelector('qti-assessment-item');
  const identifier = root?.getAttribute('identifier') ?? '';
  const title = root?.getAttribute('title') ?? '';
  const language = root?.getAttribute('xml:lang') ?? '';

  const body = doc.querySelector('qti-item-body');

  // Collect all response declarations from the document.
  const allDeclarations = [...doc.querySelectorAll('qti-response-declaration')];

  const interactions = [];

  if (body) {
    const selector = QTI_INTERACTION_TAGS.join(', ');
    const interactionEls = [...body.querySelectorAll(selector)];

    const inlineBlocks = new Map();
    for (const el of interactionEls) {
      const tagName = el.tagName.toLowerCase();
      const responseId = el.getAttribute('response-identifier');

      const responseDeclarations = allDeclarations
        .filter(d => d.getAttribute('identifier') === responseId)
        .map(d => serializer.serializeToString(d));

      if (!isInlineInteraction(tagName)) {
        interactions.push({ bodyXml: serializer.serializeToString(el), responseDeclarations });
      } else if (inlineBlocks.has(tagName)) {
        inlineBlocks.get(tagName).responseDeclarations.push(...responseDeclarations);
      } else {
        const block = { bodyXml: serializer.serializeToString(body), responseDeclarations };
        inlineBlocks.set(tagName, block);
        interactions.push(block);
      }
    }
  }

  return {
    identifier,
    title,
    language,
    itemBodyXml: body ? serializer.serializeToString(body) : '',
    interactions,
    hints: parseHints(doc),
  };
}
