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

/**
 * Reassembles a full QTI assessment-item XML string from its parsed parts.
 *
 * This is the write-path inverse of parseItem. Call it whenever an interaction
 * editor emits updated bodyXml / responseDeclarations to produce the new raw_data
 * that should be stored on the assessment item.
 *
 * @param {object} params
 * @param {string} params.identifier         - Item identifier attribute
 * @param {string} params.title              - Item title attribute
 * @param {string} params.language           - xml:lang attribute value
 * @param {string} params.bodyXml            - Serialized interaction element XML string
 * @param {string[]} params.responseDeclarations - Array of serialized declaration XML strings
 * @returns {string} Full QTI XML string
 */
export function reassembleItemXml({ identifier, title, language, bodyXml, responseDeclarations }) {
  const declarations = (responseDeclarations || []).join('\n  ');
  const lang = language || 'en';
  const id = identifier || 'item';
  const t = title || '';

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<qti-assessment-item`,
    `  xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"`,
    `  identifier="${id}"`,
    `  title="${t}"`,
    `  adaptive="false"`,
    `  time-dependent="false"`,
    `  xml:lang="${lang}"`,
    `>`,
    declarations ? `  ${declarations}` : '',
    `  <qti-item-body>`,
    `    ${bodyXml}`,
    `  </qti-item-body>`,
    `</qti-assessment-item>`,
  ]
    .filter(line => line !== '')
    .join('\n');
}
