/**
 * Shared XML parse helper for declaration tests.
 */
import { parseXML as parseXMLDocument } from '../../xml';

const serializer = new XMLSerializer();

/**
 * Parse an XML string and return the root element.
 * @param {string} xmlString
 * @returns {Element}
 */
export function parseXML(xmlString) {
  return parseXMLDocument(xmlString).documentElement;
}

/**
 * Serialize a DOM node to an XML string.
 * @param {Node} node
 * @returns {string}
 */
export function serializeXML(node) {
  return serializer.serializeToString(node);
}

/**
 * Serialize a DOM node and parse it back to a new DOM tree.
 * Useful for validating that output XML is well-formed.
 * @param {Node} node
 * @returns {Element}
 */
export function reparse(node) {
  try {
    return parseXML(serializeXML(node));
  } catch (error) {
    throw new Error(`Re-parsed XML has a parsererror:\n${error.message}`);
  }
}
