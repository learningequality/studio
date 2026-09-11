/**
 * DOM helpers for reading QTI XML.
 */

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
  // Namespace declarations are left in place. Everything here looks elements up by local
  // name, which matches in any namespace, so removing them buys nothing — while a foreign
  // namespace a nested subtree does need (MathML from the formula button, SVG) would be
  // lost with them, and inheriting the QTI namespace instead makes the item invalid.
  const doc = parser.parseFromString(xmlString, mimeType);

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
