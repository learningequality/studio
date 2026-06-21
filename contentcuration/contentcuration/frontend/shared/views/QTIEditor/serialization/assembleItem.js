/**
 * XML node builder for QTI serialization.
 *
 * Used by QTIDeclaration.getXML() and all declaration strategy classes
 * to produce DOM nodes. A module-level XML document is created once so
 * all nodes share the same owner document, avoiding adoptNode requirements
 * when assembling trees. Callers serialize to a string only at the boundary
 * (e.g. XMLSerializer.serializeToString).
 */

const xmlDoc = new DOMParser().parseFromString('<root/>', 'text/xml');

/**
 * Build an XML element node.
 *
 * @param {object} options
 * @param {string}            options.tag      - Element tag name (e.g. 'qti-response-declaration')
 * @param {Object.<string,*>} [options.attrs]    - Attribute name→value pairs;
 *                                                  null/undefined values are skipped
 * @param {Array.<Node|string>} [options.children] - Child nodes or plain strings
 * @returns {Element}
 */
export function buildXmlNode({ tag, attrs = {}, children = [] }) {
  const el = xmlDoc.createElement(tag);

  for (const [name, value] of Object.entries(attrs)) {
    if (value !== null && value !== undefined) {
      el.setAttribute(name, String(value));
    }
  }

  for (const child of children) {
    if (typeof child === 'string') {
      el.appendChild(xmlDoc.createTextNode(child));
    } else {
      el.appendChild(child);
    }
  }

  return el;
}
