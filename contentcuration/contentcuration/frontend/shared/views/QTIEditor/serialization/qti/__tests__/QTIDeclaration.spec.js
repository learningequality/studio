/* eslint-disable jest-dom/prefer-to-have-attribute, jest-dom/prefer-to-have-text-content */
import { QTIDeclaration } from '../QTIDeclaration.js';
import { CAPABILITY } from '../declarations/index.js';
import { parseXML } from './testUtils.js';
import {
  DECLARATION_WITH_MAPPING,
  MULTI_SELECT_DECLARATION,
  NO_BASETYPE_DECLARATION,
  OUTCOME_DECLARATION,
  SINGLE_SELECT_DECLARATION,
} from './fixtures/declarations.js';

const serializer = new XMLSerializer();
const parser = new DOMParser();

function reparse(node) {
  const xml = serializer.serializeToString(node);
  const doc = parser.parseFromString(xml, 'text/xml');
  if (doc.querySelector('parsererror')) throw new Error(`Re-parsed XML has a parsererror:\n${xml}`);
  return doc.documentElement;
}

// ---------------------------------------------------------------------------
// Constructor tests
// ---------------------------------------------------------------------------

describe('QTIDeclaration constructor', () => {
  it('stores scalar fields', () => {
    const d = new QTIDeclaration({
      identifier: 'RESPONSE',
      baseType: 'identifier',
      cardinality: 'single',
    });
    expect(d.identifier).toBe('RESPONSE');
    expect(d.baseType).toBe('identifier');
    expect(d.cardinality).toBe('single');
  });

  it('defaults baseType to null and cardinality to single', () => {
    const d = new QTIDeclaration({ identifier: 'SCORE' });
    expect(d.baseType).toBeNull();
    expect(d.cardinality).toBe('single');
  });

  it('throws an error if cardinality is "record"', () => {
    expect(() => {
      new QTIDeclaration({ identifier: 'X', cardinality: 'record' });
    }).toThrow('cardinality="record" is not yet supported');
  });

  it('starts with no capabilities', () => {
    const d = new QTIDeclaration({ identifier: 'X' });
    expect(d.correctResponse).toBeNull();
    expect(d.defaultValue).toBeNull();
    expect(d.mapping).toBeNull();
    expect(d.areaMapping).toBeNull();
  });

  it('defaults tag to qti-response-declaration', () => {
    const d = new QTIDeclaration({ identifier: 'X' });
    expect(d.tag).toBe('qti-response-declaration');
  });
});

// ---------------------------------------------------------------------------
// registerCapability tests
// ---------------------------------------------------------------------------

describe('QTIDeclaration.registerCapability', () => {
  it('stores and exposes a capability via its getter', () => {
    const d = new QTIDeclaration({ identifier: 'X' });
    const fakeCR = { get: () => ['A'], getXML: () => null };
    d.registerCapability(CAPABILITY.CORRECT_RESPONSE, fakeCR);
    expect(d.correctResponse).toEqual(['A']);
  });
});

// ---------------------------------------------------------------------------
// fromXML tests
// ---------------------------------------------------------------------------

describe('QTIDeclaration.fromXML', () => {
  it('reads identifier from XML', () => {
    const d = QTIDeclaration.fromXML(parseXML(SINGLE_SELECT_DECLARATION));
    expect(d.identifier).toBe('RESPONSE');
  });

  it('reads base-type from XML', () => {
    const d = QTIDeclaration.fromXML(parseXML(SINGLE_SELECT_DECLARATION));
    expect(d.baseType).toBe('identifier');
  });

  it('reads cardinality from XML', () => {
    const d = QTIDeclaration.fromXML(parseXML(SINGLE_SELECT_DECLARATION));
    expect(d.cardinality).toBe('single');
  });

  it('stores the original tag name', () => {
    const d = QTIDeclaration.fromXML(parseXML(OUTCOME_DECLARATION));
    expect(d.tag).toBe('qti-outcome-declaration');
  });

  it('registers a correctResponse capability from XML', () => {
    const d = QTIDeclaration.fromXML(parseXML(SINGLE_SELECT_DECLARATION));
    expect(d.correctResponse).toEqual(['ChoiceA']);
  });

  it('registers multiple correct response values', () => {
    const d = QTIDeclaration.fromXML(parseXML(MULTI_SELECT_DECLARATION));
    expect(d.correctResponse).toEqual(['ChoiceA', 'ChoiceC']);
  });

  it('registers a mapping capability when qti-mapping is present', () => {
    const d = QTIDeclaration.fromXML(parseXML(DECLARATION_WITH_MAPPING));
    expect(d.mapping).not.toBeNull();
    expect(d.mapping.entries).toHaveLength(2);
  });

  it('handles null base-type gracefully', () => {
    const d = QTIDeclaration.fromXML(parseXML(NO_BASETYPE_DECLARATION));
    expect(d.baseType).toBeNull();
    expect(d.correctResponse).toEqual(['true']);
  });

  it('ignores unrecognized child elements', () => {
    const xml = `
      <qti-response-declaration identifier="X" base-type="string" cardinality="single">
        <qti-unknown-element/>
      </qti-response-declaration>
    `.trim();
    expect(() => QTIDeclaration.fromXML(parseXML(xml))).not.toThrow();
  });

  it('produces no capabilities for a declaration with no known children', () => {
    const d = QTIDeclaration.fromXML(parseXML(OUTCOME_DECLARATION));
    expect(d.correctResponse).toBeNull();
    expect(d.defaultValue).toBeNull();
    expect(d.mapping).toBeNull();
    expect(d.areaMapping).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getXML / round-trip tests
// ---------------------------------------------------------------------------

describe('QTIDeclaration.getXML', () => {
  it('produces an element with the correct tag', () => {
    const d = QTIDeclaration.fromXML(parseXML(SINGLE_SELECT_DECLARATION));
    expect(d.getXML().tagName).toBe('qti-response-declaration');
  });

  it('preserves the outcome-declaration tag on round-trip', () => {
    const d = QTIDeclaration.fromXML(parseXML(OUTCOME_DECLARATION));
    expect(d.getXML().tagName).toBe('qti-outcome-declaration');
  });

  it('preserves identifier on round-trip', () => {
    const d = QTIDeclaration.fromXML(parseXML(SINGLE_SELECT_DECLARATION));
    expect(d.getXML().getAttribute('identifier')).toBe('RESPONSE');
  });

  it('preserves base-type on round-trip', () => {
    const d = QTIDeclaration.fromXML(parseXML(SINGLE_SELECT_DECLARATION));
    expect(d.getXML().getAttribute('base-type')).toBe('identifier');
  });

  it('omits base-type attr when null', () => {
    const d = QTIDeclaration.fromXML(parseXML(NO_BASETYPE_DECLARATION));
    expect(d.getXML().hasAttribute('base-type')).toBe(false);
  });

  it('includes qti-correct-response child on round-trip', () => {
    const d = QTIDeclaration.fromXML(parseXML(SINGLE_SELECT_DECLARATION));
    const xml = serializer.serializeToString(d.getXML());
    expect(xml).toContain('qti-correct-response');
    expect(xml).toContain('ChoiceA');
  });

  it('includes qti-mapping child when mapping is present', () => {
    const d = QTIDeclaration.fromXML(parseXML(DECLARATION_WITH_MAPPING));
    const xml = serializer.serializeToString(d.getXML());
    expect(xml).toContain('qti-mapping');
    expect(xml).toContain('map-key="ChoiceA"');
  });

  it('full round-trip: fromXML → getXML preserves structure', () => {
    const d = QTIDeclaration.fromXML(parseXML(MULTI_SELECT_DECLARATION));
    const node = d.getXML();
    const values = [...node.querySelectorAll('qti-correct-response qti-value')].map(
      n => n.textContent,
    );
    expect(values).toEqual(['ChoiceA', 'ChoiceC']);
  });
});

// ---------------------------------------------------------------------------
// Full XML output — QTI 3.0 compatibility
// ---------------------------------------------------------------------------

describe('QTIDeclaration full XML output (QTI compatibility)', () => {
  it('serializes a single-select declaration to well-formed XML', () => {
    const d = QTIDeclaration.fromXML(parseXML(SINGLE_SELECT_DECLARATION));
    expect(() => reparse(d.getXML())).not.toThrow();
  });

  it('re-parsed XML has qti-response-declaration root tag', () => {
    const reparsed = reparse(QTIDeclaration.fromXML(parseXML(SINGLE_SELECT_DECLARATION)).getXML());
    expect(reparsed.tagName).toBe('qti-response-declaration');
  });

  it('re-parsed XML preserves identifier attribute', () => {
    const reparsed = reparse(QTIDeclaration.fromXML(parseXML(SINGLE_SELECT_DECLARATION)).getXML());
    expect(reparsed.getAttribute('identifier')).toBe('RESPONSE');
  });

  it('re-parsed XML preserves base-type attribute', () => {
    const reparsed = reparse(QTIDeclaration.fromXML(parseXML(SINGLE_SELECT_DECLARATION)).getXML());
    expect(reparsed.getAttribute('base-type')).toBe('identifier');
  });

  it('re-parsed XML preserves cardinality attribute', () => {
    const reparsed = reparse(QTIDeclaration.fromXML(parseXML(MULTI_SELECT_DECLARATION)).getXML());
    expect(reparsed.getAttribute('cardinality')).toBe('multiple');
  });

  it('re-parsed XML contains qti-correct-response child', () => {
    const reparsed = reparse(QTIDeclaration.fromXML(parseXML(SINGLE_SELECT_DECLARATION)).getXML());
    expect(reparsed.querySelector('qti-correct-response')).not.toBeNull();
  });

  it('re-parsed XML correct-response values are intact', () => {
    const reparsed = reparse(QTIDeclaration.fromXML(parseXML(MULTI_SELECT_DECLARATION)).getXML());
    const values = [...reparsed.querySelectorAll('qti-correct-response qti-value')].map(
      n => n.textContent,
    );
    expect(values).toEqual(['ChoiceA', 'ChoiceC']);
  });

  it('re-parsed XML with qti-mapping has correct map entries', () => {
    const reparsed = reparse(QTIDeclaration.fromXML(parseXML(DECLARATION_WITH_MAPPING)).getXML());
    const entries = [...reparsed.querySelectorAll('qti-mapping qti-map-entry')];
    expect(entries).toHaveLength(2);
    expect(entries[0].getAttribute('map-key')).toBe('ChoiceA');
    expect(entries[0].getAttribute('mapped-value')).toBe('1');
  });

  it('omits base-type attr when null on re-parse', () => {
    const reparsed = reparse(QTIDeclaration.fromXML(parseXML(NO_BASETYPE_DECLARATION)).getXML());
    expect(reparsed.hasAttribute('base-type')).toBe(false);
  });

  it('preserves outcome-declaration tag on full re-parse', () => {
    const reparsed = reparse(QTIDeclaration.fromXML(parseXML(OUTCOME_DECLARATION)).getXML());
    expect(reparsed.tagName).toBe('qti-outcome-declaration');
  });

  // Identifier values can contain non-ASCII chars in i18n item banks
  it('handles non-ASCII identifiers in serialized XML (i18n)', () => {
    const d = new QTIDeclaration({
      identifier: 'RÉSPONSE_日本語',
      baseType: 'identifier',
      cardinality: 'single',
    });
    const reparsed = reparse(d.getXML());
    expect(reparsed.getAttribute('identifier')).toBe('RÉSPONSE_日本語');
  });
});
