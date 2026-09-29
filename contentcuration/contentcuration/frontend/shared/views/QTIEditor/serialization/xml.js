/**
 * DOM helpers for reading and building QTI XML.
 *
 * buildXmlNode is used by assembleItem, QTIDeclaration.getXML() and all declaration
 * strategy classes to produce DOM nodes. A module-level XML document is created once so
 * all nodes share the same owner document, avoiding adoptNode requirements when
 * assembling trees. Callers serialize to a string only at the boundary
 * (e.g. XMLSerializer.serializeToString).
 *
 * This module imports nothing else from the editor, so everything that builds XML can
 * depend on it without forming an import cycle.
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

const xmlDoc = parser.parseFromString('<root/>', 'text/xml');
const XHTML_NS = 'http://www.w3.org/1999/xhtml';

/**
 * Re-create a node parsed from HTML inside the XML document.
 *
 * The HTML parser puts elements in the XHTML namespace, and XMLSerializer then writes
 * that out as an explicit `xmlns` on every element it produces — `<p xmlns="…xhtml">`.
 * The QTI schema rejects that: inline content belongs to the QTI namespace the item root
 * declares, so these elements have to be namespace-less in order to inherit it. Foreign
 * subtrees (MathML, SVG) keep their own namespace, which QTI does expect declared.
 *
 * @param {Node} node
 * @returns {Node|null} null for node types that carry no content (comments, etc.)
 */
function adoptHtmlNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return xmlDoc.createTextNode(node.nodeValue);
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const namespace = node.namespaceURI;
  const el =
    !namespace || namespace === XHTML_NS
      ? xmlDoc.createElement(node.localName)
      : xmlDoc.createElementNS(namespace, node.tagName);

  for (const attr of node.attributes) {
    // A literal xmlns attribute would re-introduce the namespace we just dropped.
    if (attr.name !== 'xmlns') {
      el.setAttribute(attr.name, attr.value);
    }
  }

  for (const child of node.childNodes) {
    const adopted = adoptHtmlNode(child);
    if (adopted) {
      el.appendChild(adopted);
    }
  }

  return el;
}

/**
 * Build an XML element node.
 *
 * @param {object} options
 * @param {string}            options.tag - Element tag name (e.g. 'qti-response-declaration')
 * @param {Object.<string,*>}  [options.attrs]    - Attribute name→value pairs;
 *                                                  null/undefined values are skipped
 * @param {Array.<Node|string>} [options.children] - Child nodes or plain strings; mutually
 *                                                  exclusive with innerHTML
 * @param {string}             [options.innerHTML] - Raw HTML/XML string to parse and append
 *                                                  as children; mutually exclusive with children
 * @returns {Element}
 */
export function buildXmlNode({ tag, attrs = {}, children, innerHTML }) {
  if (children !== undefined && innerHTML !== undefined) {
    throw new Error('buildXmlNode: "children" and "innerHTML" are mutually exclusive');
  }

  const el = xmlDoc.createElement(tag);

  for (const [name, value] of Object.entries(attrs)) {
    if (value !== null && value !== undefined) {
      el.setAttribute(name, String(value));
    }
  }

  if (innerHTML !== undefined) {
    const htmlDoc = parseXML(`<!DOCTYPE html><body>${innerHTML}</body>`, 'text/html');
    for (const child of [...htmlDoc.body.childNodes]) {
      const adopted = adoptHtmlNode(child);
      if (adopted) {
        el.appendChild(adopted);
      }
    }
  } else {
    for (const child of children ?? []) {
      if (typeof child === 'string') {
        el.appendChild(xmlDoc.createTextNode(child));
      } else {
        // DOM nodes created outside this module (e.g. by a separate DOMParser call
        // or in a browser document) have a different ownerDocument. Appending a
        // foreign node throws a HierarchyRequestError in some environments, so we
        // adopt it into xmlDoc first via importNode.
        const childNode = child.ownerDocument === xmlDoc ? child : xmlDoc.importNode(child, true);
        el.appendChild(childNode);
      }
    }
  }

  return el;
}

/**
 * Build a float `<qti-base-value>`. Whole numbers keep a decimal (`1.0`, not `1`) so the
 * value reads as a float wherever it is written.
 *
 * @param {number} value
 * @returns {Element}
 */
export function buildFloatNode(value) {
  return buildXmlNode({
    tag: 'qti-base-value',
    attrs: { 'base-type': 'float' },
    children: [Number.isInteger(value) ? value.toFixed(1) : String(value)],
  });
}
