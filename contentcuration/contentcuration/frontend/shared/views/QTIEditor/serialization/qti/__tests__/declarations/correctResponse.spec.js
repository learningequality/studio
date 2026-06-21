/* eslint-disable jest-dom/prefer-to-have-attribute, jest-dom/prefer-to-have-text-content */
import CorrectResponse from '../../declarations/correctResponse.js';
import { QTIDeclaration } from '../../QTIDeclaration.js';
import { CAPABILITY } from '../../declarations/index.js';
import { parseXML } from '../testUtils.js';

const serializer = new XMLSerializer();
const parser = new DOMParser();

function makeDeclaration() {
  return new QTIDeclaration({
    identifier: 'RESPONSE',
    baseType: 'identifier',
    cardinality: 'single',
  });
}

function parseCorrectResponse(xmlString) {
  return parseXML(xmlString).querySelector('qti-correct-response');
}

/**
 * Serialize a node to an XML string, then re-parse it.
 * Throws if the output is not well-formed XML, proving it is safe for a QTI player to consume.
 */
function reparse(node) {
  const xml = serializer.serializeToString(node);
  const doc = parser.parseFromString(xml, 'text/xml');
  if (doc.querySelector('parsererror')) {
    throw new Error(`Re-parsed XML has a parsererror:\n${xml}`);
  }
  return doc.documentElement;
}

describe('CorrectResponse', () => {
  describe('constructor', () => {
    it('stores values', () => {
      const cr = new CorrectResponse(['A', 'B']);
      expect(cr.get()).toEqual(['A', 'B']);
    });

    it('stores an empty array', () => {
      const cr = new CorrectResponse([]);
      expect(cr.get()).toEqual([]);
    });
  });

  describe('fromXML', () => {
    it('parses a single qti-value', () => {
      const xmlNode = parseCorrectResponse(`
        <qti-response-declaration identifier="RESPONSE" base-type="identifier" cardinality="single">
          <qti-correct-response>
            <qti-value>ChoiceA</qti-value>
          </qti-correct-response>
        </qti-response-declaration>
      `);
      const cr = CorrectResponse.fromXML(xmlNode, makeDeclaration());
      expect(cr.get()).toEqual(['ChoiceA']);
    });

    it('parses multiple qti-value children', () => {
      const xmlNode = parseCorrectResponse(`
        <qti-response-declaration identifier="RESPONSE" base-type="identifier" cardinality="multiple">
          <qti-correct-response>
            <qti-value>ChoiceA</qti-value>
            <qti-value>ChoiceC</qti-value>
          </qti-correct-response>
        </qti-response-declaration>
      `);
      const cr = CorrectResponse.fromXML(xmlNode, makeDeclaration());
      expect(cr.get()).toEqual(['ChoiceA', 'ChoiceC']);
    });

    it('trims whitespace from values', () => {
      const xmlNode = parseCorrectResponse(`
        <qti-response-declaration identifier="X" base-type="string" cardinality="single">
          <qti-correct-response>
            <qti-value>  hello  </qti-value>
          </qti-correct-response>
        </qti-response-declaration>
      `);
      const cr = CorrectResponse.fromXML(xmlNode, makeDeclaration());
      expect(cr.get()).toEqual(['hello']);
    });

    it('registers itself on the parent declaration as CORRECT_RESPONSE capability', () => {
      const xmlNode = parseCorrectResponse(`
        <qti-response-declaration identifier="RESPONSE" base-type="identifier" cardinality="single">
          <qti-correct-response>
            <qti-value>ChoiceA</qti-value>
          </qti-correct-response>
        </qti-response-declaration>
      `);
      const declaration = makeDeclaration();
      CorrectResponse.fromXML(xmlNode, declaration);
      expect(declaration._capabilities[CAPABILITY.CORRECT_RESPONSE]).toBeDefined();
      expect(declaration.correctResponse).toEqual(['ChoiceA']);
    });

    it('returns an empty array for a qti-correct-response with no values', () => {
      const xmlNode = parseCorrectResponse(`
        <qti-response-declaration identifier="X" base-type="string" cardinality="single">
          <qti-correct-response/>
        </qti-response-declaration>
      `);
      const cr = CorrectResponse.fromXML(xmlNode, makeDeclaration());
      expect(cr.get()).toEqual([]);
    });
  });

  describe('getXML', () => {
    it('produces a qti-correct-response element', () => {
      expect(new CorrectResponse(['ChoiceA']).getXML().tagName).toBe('qti-correct-response');
    });

    it('contains a qti-value child for each value', () => {
      const values = [
        ...new CorrectResponse(['ChoiceA', 'ChoiceC']).getXML().querySelectorAll('qti-value'),
      ].map(n => n.textContent);
      expect(values).toEqual(['ChoiceA', 'ChoiceC']);
    });

    it('produces an empty qti-correct-response when values is empty', () => {
      expect(new CorrectResponse([]).getXML().querySelectorAll('qti-value').length).toBe(0);
    });

    it('round-trips: qti-value child carries correct text', () => {
      const xmlNode = parseCorrectResponse(`
        <qti-response-declaration identifier="RESPONSE" base-type="identifier" cardinality="single">
          <qti-correct-response><qti-value>ChoiceA</qti-value></qti-correct-response>
        </qti-response-declaration>
      `);
      const values = [
        ...CorrectResponse.fromXML(xmlNode, makeDeclaration())
          .getXML()
          .querySelectorAll('qti-value'),
      ].map(n => n.textContent);
      expect(values).toEqual(['ChoiceA']);
    });

    it('round-trips multiple values preserving order', () => {
      const xmlNode = parseCorrectResponse(`
        <qti-response-declaration identifier="RESPONSE" base-type="identifier" cardinality="multiple">
          <qti-correct-response>
            <qti-value>ChoiceB</qti-value>
            <qti-value>ChoiceC</qti-value>
          </qti-correct-response>
        </qti-response-declaration>
      `);
      const values = [
        ...CorrectResponse.fromXML(xmlNode, makeDeclaration())
          .getXML()
          .querySelectorAll('qti-value'),
      ].map(n => n.textContent);
      expect(values).toEqual(['ChoiceB', 'ChoiceC']);
    });
  });

  describe('full XML output (QTI compatibility)', () => {
    it('serializes to well-formed XML that re-parses without error', () => {
      const cr = new CorrectResponse(['ChoiceA', 'ChoiceC']);
      expect(() => reparse(cr.getXML())).not.toThrow();
    });

    it('re-parsed XML has the correct qti-correct-response root tag', () => {
      const reparsed = reparse(new CorrectResponse(['ChoiceA']).getXML());
      expect(reparsed.tagName).toBe('qti-correct-response');
    });

    it('re-parsed XML has the correct number of qti-value children', () => {
      const reparsed = reparse(new CorrectResponse(['ChoiceA', 'ChoiceC']).getXML());
      expect(reparsed.querySelectorAll('qti-value').length).toBe(2);
    });

    it('re-parsed XML qti-value text content is preserved exactly', () => {
      const reparsed = reparse(new CorrectResponse(['ChoiceA', 'ChoiceC']).getXML());
      const values = [...reparsed.querySelectorAll('qti-value')].map(n => n.textContent);
      expect(values).toEqual(['ChoiceA', 'ChoiceC']);
    });

    // QTI values can be non-ASCII (e.g. Arabic/CJK choice identifiers authored by i18n users)
    it('correctly encodes non-ASCII value content (i18n)', () => {
      const cr = new CorrectResponse(['选择甲', 'اختيار_أ']);
      const reparsed = reparse(cr.getXML());
      const values = [...reparsed.querySelectorAll('qti-value')].map(n => n.textContent);
      expect(values).toEqual(['选择甲', 'اختيار_أ']);
    });

    // XML special characters in values must be entity-escaped by the serializer
    it('correctly escapes XML special characters in values', () => {
      // Ampersand is a common edge case in authored content (e.g. "A & B")
      const cr = new CorrectResponse(['A & B']);
      const reparsed = reparse(cr.getXML());
      expect(reparsed.querySelector('qti-value').textContent).toBe('A & B');
    });
  });
});
