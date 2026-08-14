/**
 * XML node builder for QTI serialization.
 *
 * Used by QTIDeclaration.getXML() and all declaration strategy classes
 * to produce DOM nodes. A module-level XML document is created once so
 * all nodes share the same owner document, avoiding adoptNode requirements
 * when assembling trees. Callers serialize to a string only at the boundary
 * (e.g. XMLSerializer.serializeToString).
 */

import { parseXML } from './xml';

const xmlDoc = new DOMParser().parseFromString('<root/>', 'text/xml');
const serializer = new XMLSerializer();

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

/** The scoring outcome every item carries, matching what the legacy conversion emits. */
function buildOutcomeDeclarationNode() {
  return buildXmlNode({
    tag: 'qti-outcome-declaration',
    attrs: { identifier: 'SCORE', cardinality: 'single', 'base-type': 'float' },
  });
}

/**
 * How the item is scored, or null when there is nothing to score against.
 *
 * Written rather than carried over from whatever the item arrived with: an author's edit
 * can invalidate the rules a previous tool recorded, and match_correct is the one template
 * this editor knows how to keep true. An item with no response declaration — a question
 * with nothing to answer — gets no processing at all, which is what the converter does too.
 */
function buildResponseProcessingNode(declarationCount) {
  if (!declarationCount) {
    return null;
  }
  return buildXmlNode({
    tag: 'qti-response-processing',
    attrs: {
      template: 'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct',
    },
  });
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
 * @param {string}   params.language              - Language tag, or '' to omit it
 * @param {string}   params.bodyXml               - Serialized interaction element XML string
 * @param {string[]} params.responseDeclarations  - Array of serialized declaration XML strings
 * @returns {string} Full QTI XML string
 */
export function assembleItemXml({
  identifier,
  title,
  language,
  bodyXml,
  responseDeclarations,
}) {
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

  const responseProcessingNode = buildResponseProcessingNode(declNodes.length);

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
      // Omitted rather than guessed when the item has no language: the schema allows an
      // item without one.
      'xml:lang': language || null,
    },
    // The schema fixes this order: declarations, the body, then the processing.
    children: [
      ...declNodes,
      buildOutcomeDeclarationNode(),
      itemBodyNode,
      ...(responseProcessingNode ? [responseProcessingNode] : []),
    ],
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n${serializer.serializeToString(assessmentItemNode)}`;
}
