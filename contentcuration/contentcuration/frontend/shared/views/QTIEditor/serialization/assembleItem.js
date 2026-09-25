/**
 * XML node builder for QTI serialization.
 *
 * Used by QTIDeclaration.getXML() and all declaration strategy classes
 * to produce DOM nodes. A module-level XML document is created once so
 * all nodes share the same owner document, avoiding adoptNode requirements
 * when assembling trees. Callers serialize to a string only at the boundary
 * (e.g. XMLSerializer.serializeToString).
 */

import { HINT_CATALOG_ID, HINT_SUPPORT, hintHasContent } from './hints';
import { QTIDeclaration } from './qti/QTIDeclaration';
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

/**
 * Build the `<qti-catalog-info>` holding the item's hints, or null when there is nothing
 * to write. A catalog has to hold at least one card, so an item whose hints are all empty
 * carries no catalog at all rather than an empty one.
 *
 * @param {Array<{ content: string }>} hints
 * @returns {Element|null}
 */
function buildHintCatalogNode(hints) {
  const cards = hints.filter(hintHasContent).map(hint =>
    buildXmlNode({
      tag: 'qti-card',
      attrs: { support: HINT_SUPPORT },
      children: [buildXmlNode({ tag: 'qti-html-content', innerHTML: hint.content })],
    }),
  );

  if (!cards.length) {
    return null;
  }

  return buildXmlNode({
    tag: 'qti-catalog-info',
    children: [
      buildXmlNode({ tag: 'qti-catalog', attrs: { id: HINT_CATALOG_ID }, children: cards }),
    ],
  });
}

const SCORE = 'SCORE';
const RAW_SCORE = 'RAW_SCORE';

/** SCORE matches what the legacy conversion emits; RAW_SCORE sums several responses. */
function buildOutcomeDeclarationNode(identifier) {
  return buildXmlNode({
    tag: 'qti-outcome-declaration',
    attrs: { identifier, cardinality: 'single', 'base-type': 'float' },
  });
}

export function buildFloatNode(value) {
  return buildXmlNode({
    tag: 'qti-base-value',
    attrs: { 'base-type': 'float' },
    children: [value.toFixed(1)],
  });
}

/**
 * Regenerated on every save rather than carried over: an author's edit can invalidate the
 * rules a previous tool recorded. No response declaration — nothing to answer — means no
 * processing, as the converter does. One keeps match_correct. Several are each scored by
 * their declaration's rule and averaged; if any cannot be scored there is no processing,
 * since an average that skips a response would misgrade the item.
 *
 * @param {Element[]} declNodes
 * @returns {{ outcomeDeclarations: Element[], responseProcessing: Element|null }}
 */
function buildScoringNodes(declNodes) {
  const outcomeDeclarations = [buildOutcomeDeclarationNode(SCORE)];
  if (!declNodes.length) {
    return { outcomeDeclarations, responseProcessing: null };
  }
  if (declNodes.length === 1) {
    return {
      outcomeDeclarations,
      responseProcessing: buildXmlNode({
        tag: 'qti-response-processing',
        attrs: {
          template: 'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct.xml',
        },
      }),
    };
  }

  const scored = declNodes.map(node => {
    const declaration = QTIDeclaration.fromXML(node);
    return { identifier: declaration.identifier, rule: declaration.getScoringRule(RAW_SCORE) };
  });
  const unscorable = scored.filter(({ rule }) => !rule).map(({ identifier }) => identifier);
  if (unscorable.length) {
    // eslint-disable-next-line no-console
    console.warn(
      `[QTI Editor] Writing no response processing: cannot score ${unscorable.join(', ')}`,
    );
    return { outcomeDeclarations, responseProcessing: null };
  }

  return {
    outcomeDeclarations: [...outcomeDeclarations, buildOutcomeDeclarationNode(RAW_SCORE)],
    responseProcessing: buildXmlNode({
      tag: 'qti-response-processing',
      children: [
        // Outcomes with no default start as NULL, and qti-sum with a NULL operand is NULL.
        buildXmlNode({
          tag: 'qti-set-outcome-value',
          attrs: { identifier: RAW_SCORE },
          children: [buildFloatNode(0)],
        }),
        ...scored.map(({ rule }) => rule),
        buildXmlNode({
          tag: 'qti-set-outcome-value',
          attrs: { identifier: SCORE },
          children: [
            buildXmlNode({
              tag: 'qti-divide',
              children: [
                buildXmlNode({ tag: 'qti-variable', attrs: { identifier: RAW_SCORE } }),
                buildFloatNode(declNodes.length),
              ],
            }),
          ],
        }),
      ],
    }),
  };
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
 * @param {Array<{ content: string }>} [params.hints] - Item hints, in order
 * @returns {string} Full QTI XML string
 */
export function assembleItemXml({
  identifier,
  title,
  language,
  bodyXml,
  responseDeclarations,
  hints = [],
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

  const catalogInfoNode = buildHintCatalogNode(hints);
  const { outcomeDeclarations, responseProcessing } = buildScoringNodes(declNodes);

  const assessmentItemNode = buildXmlNode({
    tag: 'qti-assessment-item',
    attrs: {
      xmlns: 'http://www.imsglobal.org/xsd/imsqtiasi_v3p0',
      // New items get their identifier and title from createBlankItem.js; these fallbacks
      // only cover items assembled from XML that never carried them.
      identifier: identifier || 'item',
      title: title || '',
      adaptive: 'false',
      'time-dependent': 'false',
      // Omitted rather than guessed when the item has no language: the schema allows an
      // item without one.
      'xml:lang': language || null,
    },
    // The schema fixes this order: declarations, the body, the catalog, the processing.
    children: [
      ...declNodes,
      ...outcomeDeclarations,
      itemBodyNode,
      ...(catalogInfoNode ? [catalogInfoNode] : []),
      ...(responseProcessing ? [responseProcessing] : []),
    ],
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n${serializer.serializeToString(assessmentItemNode)}`;
}
