/**
 * Shared XML parse helper for declaration tests.
 * Mirrors the approach in Kolibri's qtiXmlHelpers.js test utility.
 */
const parser = new DOMParser();

/**
 * Parse an XML string and return the root element.
 * @param {string} xmlString
 * @returns {Element}
 */
export function parseXML(xmlString) {
  const doc = parser.parseFromString(xmlString, 'text/xml');
  const error = doc.querySelector('parsererror');
  if (error) throw new Error(`XML parse error: ${error.textContent}`);
  return doc.documentElement;
}
