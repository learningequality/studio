/**
 * XML node builder for QTI serialization.
 *
 * Used by QTIDeclaration.getXML() and all declaration strategy classes
 * to produce DOM nodes. A module-level XML document is created once so
 * all nodes share the same owner document, avoiding adoptNode requirements
 * when assembling trees. Callers serialize to a string only at the boundary
 * (e.g. XMLSerializer.serializeToString).
 */

import { parseXML } from './parseItem';

const xmlDoc = new DOMParser().parseFromString('<root/>', 'text/xml');
const serializer = new XMLSerializer();

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
      el.appendChild(xmlDoc.importNode(child, true));
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
 * Assembles a full QTI assessment-item XML string from its constituent parts.
 *
 * This is the write-path complement of parseItem. Call it whenever an interaction
 * editor emits an updated interaction to produce the raw_data stored on the item.
 * Attributes are set via setAttribute so the DOM handles all escaping — no manual
 * XML-escaping helpers are required.
 *
 * @param {object}   params
 * @param {string}   params.identifier            - Item identifier attribute
 * @param {string}   params.title                 - Item title attribute
 * @param {string}   params.language              - xml:lang attribute value
 * @param {string}   params.bodyXml               - Serialized interaction element XML string
 * @param {string[]} params.responseDeclarations  - Array of serialized declaration XML strings
 * @returns {string} Full QTI XML string
 */
export function assembleItemXml({ identifier, title, language, bodyXml, responseDeclarations }) {
  // Parse each serialized declaration string back into a DOM node so it can be
  // adopted into the assessment item tree via buildXmlNode's importNode logic.
  const declNodes = (responseDeclarations || []).map(declXml => {
    const doc = parseXML(declXml);
    return doc.documentElement;
  });

  const bodyDoc = parseXML(bodyXml || '<qti-item-body/>');
  const bodyRoot = bodyDoc.documentElement;
  const itemBodyNode =
    bodyRoot.tagName.toLowerCase() === 'qti-item-body'
      ? bodyRoot
      : buildXmlNode({
          tag: 'qti-item-body',
          children: [bodyRoot],
        });

  const assessmentItemNode = buildXmlNode({
    tag: 'qti-assessment-item',
    attrs: {
      xmlns: 'http://www.imsglobal.org/xsd/imsqtiasi_v3p0',
      // TODO: We will need to properly generate the identifier and title
      // on the useQtiItem composable when we integrate the question type selector
      // and have the add question button working.
      identifier: identifier || 'item',
      title: title || '',
      adaptive: 'false',
      'time-dependent': 'false',
      'xml:lang': language || 'en',
    },
    children: [...declNodes, itemBodyNode],
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n${serializer.serializeToString(assessmentItemNode)}`;
}
