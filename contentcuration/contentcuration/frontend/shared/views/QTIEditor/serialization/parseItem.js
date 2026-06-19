import { QTI_INTERACTION_TAGS } from '../constants';

const serializer = new XMLSerializer();
const parser = new DOMParser();

/**
 * Parses a QTI XML string into a validated XML Document.
 *
 * @param {string} xmlString - Raw QTI XML string
 * @returns {Document} Parsed XML Document
 * @throws {Error} If the XML is malformed or contains a parsererror
 */
export function parseXML(xmlString) {
  const doc = parser.parseFromString(xmlString, 'text/xml');

  // DOMParser never throws — it signals failure via a <parsererror> node.
  const error = doc.querySelector('parsererror');
  if (error) {
    throw new Error(`QTI XML parse error: ${error.textContent.trim()}`);
  }

  return doc;
}

/**
 * Parses a raw QTI XML string into the structured ItemModel.
 *
 * Each interaction block in the item body becomes one entry in `interactions`.
 * A response declaration belongs to an interaction when the declaration's
 * `identifier` matches the interaction's `response-identifier` attribute.
 *
 * @param {string} rawData - Raw QTI XML string (the full assessment item XML)
 * @returns {{
 *   identifier: string,
 *   title: string,
 *   language: string,
 *   interactions: Array<{ bodyXml: string, responseDeclarations: string[] }>
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

    for (const el of interactionEls) {
      const responseId = el.getAttribute('response-identifier');

      const responseDeclarations = allDeclarations
        .filter(d => d.getAttribute('identifier') === responseId)
        .map(d => serializer.serializeToString(d));

      interactions.push({
        bodyXml: serializer.serializeToString(el),
        responseDeclarations,
      });
    }
  }

  return { identifier, title, language, interactions };
}
