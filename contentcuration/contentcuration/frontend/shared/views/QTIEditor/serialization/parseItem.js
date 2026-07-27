import { QTI_INTERACTION_TAGS, INLINE_INTERACTION_TAGS } from '../constants';

const serializer = new XMLSerializer();
const parser = new DOMParser();

/**
 * Parses a QTI XML or HTML string into a Document.
 *
 * @param {string} xmlString - Raw QTI XML (or HTML fragment) string
 * @param {string} [mimeType='text/xml'] - Parse mode. `'text/xml'` runs the
 *   `parsererror` check; `'text/html'` parses leniently and never throws.
 * @returns {Document} Parsed XML or HTML Document
 * @throws {Error} If parsing as `'text/xml'` and the input is malformed or
 *   contains a parsererror. HTML parsing never throws.
 */
export function parseXML(xmlString, mimeType = 'text/xml') {
  let input = xmlString;
  // Remove xmlns to ensure querySelector works.
  if (mimeType === 'text/xml') {
    input = xmlString.replace(/ xmlns="[^"]*"/g, '');
  }

  const doc = parser.parseFromString(input, mimeType);

  // DOMParser never throws — it signals failure via a <parsererror> node. This
  // only applies to XML: the HTML parser recovers silently and never emits one,
  // so an HTML document literally containing a <parsererror> must not trip it.
  if (mimeType === 'text/xml') {
    const error = doc.querySelector('parsererror');
    if (error) {
      throw new Error(`QTI XML parse error: ${error.textContent.trim()}`);
    }
  }

  return doc;
}

/**
 * Extract the inner HTML of the first <qti-prompt> child of an interaction element.
 * Returns an empty string when no prompt element is present.
 * Using innerHTML (not textContent) preserves rich inline markup (<p>, <strong>, etc.)
 * for round-trip fidelity.
 *
 * @param {Element} interactionEl - The <qti-*-interaction> root element
 * @returns {string}
 */
export function getPromptHTML(interactionEl) {
  const promptEl = interactionEl.querySelector('qti-prompt');
  return promptEl ? promptEl.innerHTML : '';
}

/**
 * Parses a raw QTI XML string into the structured ItemModel.
 *
 * Each interaction block in the item body becomes one entry in `interactions`.
 * A response declaration belongs to an interaction when the declaration's
 * `identifier` matches the interaction's `response-identifier` attribute.
 *
 * For descriptors with `placement: 'inline'`, `bodyXml` is the serialized
 * `<qti-item-body>` rather than the interaction element alone, so the
 * interaction's parse() function can recover prompt content from body siblings.
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

      const isInline = INLINE_INTERACTION_TAGS.has(el.tagName.toLowerCase());

      interactions.push({
        bodyXml: isInline ? serializer.serializeToString(body) : serializer.serializeToString(el),
        responseDeclarations,
      });
    }
  }

  return { identifier, title, language, interactions };
}
