/* eslint-disable jest-dom/prefer-to-have-attribute, jest-dom/prefer-to-have-text-content */
import DefaultValue from '../../declarations/defaultValue.js';
import { QTIDeclaration } from '../../QTIDeclaration.js';
import { CAPABILITY } from '../../declarations/index.js';
import { parseXML } from '../testUtils.js';

const parser = new DOMParser();
const serializer = new XMLSerializer();

function reparse(node) {
  const xml = serializer.serializeToString(node);
  const doc = parser.parseFromString(xml, 'text/xml');
  if (doc.querySelector('parsererror')) throw new Error(`Re-parsed XML has a parsererror:\n${xml}`);
  return doc.documentElement;
}

function makeDeclaration() {
  return new QTIDeclaration({ identifier: 'SCORE', baseType: 'float', cardinality: 'single' });
}

function parseDefaultValue(xmlString) {
  return parseXML(xmlString).querySelector('qti-default-value');
}

describe('DefaultValue', () => {
  describe('constructor', () => {
    it('stores values', () => {
      const dv = new DefaultValue(['0']);
      expect(dv.get()).toEqual(['0']);
    });
  });

  describe('fromXML', () => {
    it('parses qti-value children as trimmed strings', () => {
      const xmlNode = parseDefaultValue(`
        <qti-response-declaration identifier="X" base-type="float" cardinality="single">
          <qti-default-value>
            <qti-value>0.5</qti-value>
          </qti-default-value>
        </qti-response-declaration>
      `);
      const dv = DefaultValue.fromXML(xmlNode, makeDeclaration());
      expect(dv.get()).toEqual(['0.5']);
    });

    it('registers itself as DEFAULT_VALUE capability', () => {
      const xmlNode = parseDefaultValue(`
        <qti-response-declaration identifier="X" base-type="float" cardinality="single">
          <qti-default-value>
            <qti-value>1</qti-value>
          </qti-default-value>
        </qti-response-declaration>
      `);
      const declaration = makeDeclaration();
      DefaultValue.fromXML(xmlNode, declaration);
      expect(declaration._capabilities[CAPABILITY.DEFAULT_VALUE]).toBeDefined();
      expect(declaration.defaultValue).toEqual(['1']);
    });
  });

  describe('getXML', () => {
    it('produces a qti-default-value element', () => {
      expect(new DefaultValue(['0']).getXML().tagName).toBe('qti-default-value');
    });

    it('contains a qti-value for each value', () => {
      const values = [
        ...new DefaultValue(['true', 'false']).getXML().querySelectorAll('qti-value'),
      ].map(n => n.textContent);
      expect(values).toEqual(['true', 'false']);
    });

    it('round-trips through XML preserving value text', () => {
      const xmlNode = parseDefaultValue(`
        <qti-response-declaration identifier="X" base-type="float" cardinality="single">
          <qti-default-value>
            <qti-value>3.14</qti-value>
          </qti-default-value>
        </qti-response-declaration>
      `);
      const values = [
        ...DefaultValue.fromXML(xmlNode, makeDeclaration()).getXML().querySelectorAll('qti-value'),
      ].map(n => n.textContent);
      expect(values).toEqual(['3.14']);
    });
  });

  describe('full XML output (QTI compatibility)', () => {
    it('serializes to well-formed XML that re-parses without error', () => {
      expect(() => reparse(new DefaultValue(['0.5']).getXML())).not.toThrow();
    });

    it('re-parsed XML has qti-default-value root tag', () => {
      const reparsed = reparse(new DefaultValue(['0.5']).getXML());
      expect(reparsed.tagName).toBe('qti-default-value');
    });

    it('re-parsed XML preserves qti-value text content', () => {
      const reparsed = reparse(new DefaultValue(['3.14']).getXML());
      expect(reparsed.querySelector('qti-value').textContent).toBe('3.14');
    });

    // DefaultValue can hold non-ASCII strings (e.g. CJK default text in i18n items)
    it('correctly encodes non-ASCII value content (i18n)', () => {
      const reparsed = reparse(new DefaultValue(['默认值']).getXML());
      expect(reparsed.querySelector('qti-value').textContent).toBe('默认值');
    });
  });
});
