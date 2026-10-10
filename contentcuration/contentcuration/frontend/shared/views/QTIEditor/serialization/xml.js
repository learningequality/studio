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
 * Extract the markup of the first <qti-prompt> child of an interaction element, as HTML.
 * Returns an empty string when no prompt element is present.
 *
 * @param {Element} interactionEl - The <qti-*-interaction> root element
 * @returns {string}
 */
export function getPromptHTML(interactionEl) {
  const promptEl = interactionEl.querySelector('qti-prompt');
  return promptEl ? getContentHTML(promptEl) : '';
}

/**
 * An element's content as HTML, for a rich text editor to load. Not `innerHTML`: see
 * serializeAsHtml.
 *
 * @param {Element} el
 * @returns {string}
 */
export function getContentHTML(el) {
  return serializeAsHtml([...el.childNodes], el.namespaceURI);
}

const xmlDoc = parser.parseFromString('<root/>', 'text/xml');
const XHTML_NS = 'http://www.w3.org/1999/xhtml';
const DROPPED_ELEMENTS = new Set(['noscript', 'script', 'style']);
const RAW_TEXT_ELEMENTS = new Set(['iframe', 'noembed', 'noframes', 'plaintext', 'xmp']);

/**
 * Re-create a node parsed from HTML inside the XML document.
 *
 * The HTML parser puts elements in the XHTML namespace, and XMLSerializer then writes
 * that out as an explicit `xmlns` on every element it produces — `<p xmlns="…xhtml">`.
 * The QTI schema rejects that: inline content belongs to the QTI namespace the item root
 * declares, so these elements have to be namespace-less in order to inherit it. Foreign
 * subtrees (MathML, SVG) keep their own namespace, which QTI does expect declared.
 * serializeAsHtml uses it the other way round, from XML into an HTML document.
 *
 * @param {Node} node
 * @param {Document} [doc] - Document to re-create the node in
 * @param {string|null} [plainNamespace] - Namespace whose elements become the document's
 *   default ones; any other is kept
 * @returns {Node|null} null for node types that carry no content (comments, etc.) and, when
 *   re-creating into an HTML document, for noscript, script and style elements
 */
function adoptNode(node, doc = xmlDoc, plainNamespace = XHTML_NS) {
  if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE) {
    return doc.createTextNode(node.nodeValue);
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const namespace = node.namespaceURI;
  const el =
    !namespace || namespace === plainNamespace
      ? doc.createElement(node.localName)
      : doc.createElementNS(namespace, node.tagName);

  // The HTML serializer writes these elements' text unescaped, so escaped markup in it
  // would come back live. TipTap ignores noscript, script and style, and keeps only the
  // others' text.
  if (el.namespaceURI === XHTML_NS) {
    if (DROPPED_ELEMENTS.has(el.localName)) {
      return null;
    }
    if (RAW_TEXT_ELEMENTS.has(el.localName)) {
      return doc.createTextNode(node.textContent);
    }
  }

  for (const attr of node.attributes) {
    // A literal xmlns attribute would re-introduce the namespace we just dropped.
    if (attr.name !== 'xmlns') {
      el.setAttribute(attr.name, attr.value);
    }
  }

  for (const child of node.childNodes) {
    const adopted = adoptNode(child, doc, plainNamespace);
    if (adopted) {
      el.appendChild(adopted);
    }
  }

  return el;
}

const XMLNS_NS = 'http://www.w3.org/2000/xmlns/';

export const XSI_NS = 'http://www.w3.org/2001/XMLSchema-instance';

/** The `xsi:schemaLocation` the converter writes on an item. */
export const QTI_SCHEMA_LOCATION =
  'http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd';

export const XML_NS = 'http://www.w3.org/XML/1998/namespace';

/**
 * @param {Element} el
 * @returns {Attr[]} The element's attributes, less namespace declarations
 */
export function attributesOf(el) {
  return [...el.attributes].filter(attr => attr.namespaceURI !== XMLNS_NS);
}

/**
 * Whether an element has attributes beyond namespace declarations.
 *
 * @param {Element} el
 * @returns {boolean}
 */
export function hasNonNamespaceAttributes(el) {
  return attributesOf(el).length > 0;
}

/**
 * Whether a node is content: an element or text (CDATA included) beyond whitespace. Comments
 * and the like carry none.
 *
 * @param {Node} node
 * @returns {boolean}
 */
export function isContentNode(node) {
  return (
    node.nodeType === Node.ELEMENT_NODE ||
    ((node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE) &&
      /[^ \t\r\n]/.test(node.nodeValue))
  );
}

/** @returns {boolean} Whether the node is this element, in its parent's namespace */
export function isChildElement(node, localName) {
  return node.localName === localName && node.namespaceURI === node.parentNode.namespaceURI;
}

/** @returns {Node[]} The node's children that isContentNode counts */
export function contentChildrenOf(node) {
  return [...node.childNodes].filter(isContentNode);
}

/**
 * Serialize XML nodes as an HTML string, for state that a rich text editor parses as HTML.
 *
 * XMLSerializer writes an empty element as `<x/>`, and the HTML parser does not treat `/>` as
 * self-closing on non-void elements such as `<span>` or QTI's, so the following siblings end up
 * nested inside it. It also writes `xmlns` on elements in the item's namespace. Re-creating the
 * nodes in an HTML document gives every element an explicit end tag and no `xmlns`; foreign
 * subtrees (MathML, SVG) keep their namespace.
 *
 * @param {Node[]} nodes
 * @param {string|null} [namespace] - Namespace of the plain elements, e.g. the item's QTI one
 * @returns {string}
 */
export function serializeAsHtml(nodes, namespace = null) {
  const htmlDoc = parseXML('<!DOCTYPE html><body></body>', 'text/html');
  for (const node of nodes) {
    const converted = adoptNode(node, htmlDoc, namespace);
    if (converted) {
      htmlDoc.body.appendChild(converted);
    }
  }
  return htmlDoc.body.innerHTML;
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
      const adopted = adoptNode(child);
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

const BLOCK_TAGS = new Set([
  'p',
  'div',
  'ul',
  'ol',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'pre',
  'table',
  'hr',
  // Valid only directly under <qti-item-body>, so wrapping it fails the schema.
  'qti-rubric-block',
]);

/**
 * Wrap each run of top-level text and non-block elements (including TipTap's `<img>` and
 * `<small>`, which the XSD only allows inside a block) in one `<div>`, so `<qti-item-body>`
 * holds only blocks and every child can carry a marker attribute. TipTap unwraps a `<div>` on
 * reopen, so this is stable across saves. Whitespace-only text is dropped.
 *
 * @param {Element} container Changed in place: inline runs move out into the new `<div>`s
 * @returns {Element[]} The container's children, as blocks
 */
export function wrapInlineRuns(container) {
  const blocks = [];
  let run = null;
  for (const node of [...container.childNodes]) {
    if (node.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has(node.localName)) {
      blocks.push(node);
      run = null;
    } else if (run || node.nodeType === Node.ELEMENT_NODE || node.nodeValue.trim()) {
      if (!run) {
        run = buildXmlNode({ tag: 'div' });
        blocks.push(run);
      }
      run.appendChild(node);
    }
  }
  return blocks;
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
