import { QTIDeclaration } from '../QTIDeclaration.js';
import { QuestionType } from '../../../constants.js';

import { getSchemaForType, isBaseTypeCompatible } from '../interactionSchema.js';
import CorrectResponse from '../declarations/correctResponse.js';
import Mapping from '../declarations/mapping.js';
import { parseXML } from './testUtils.js';

const serializer = new XMLSerializer();

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeSingleSelectDecl(values = ['ChoiceA']) {
  const xml = `
    <qti-response-declaration identifier="RESPONSE" base-type="identifier" cardinality="single">
      <qti-correct-response>
        ${values.map(v => `<qti-value>${v}</qti-value>`).join('')}
      </qti-correct-response>
    </qti-response-declaration>
  `.trim();
  return QTIDeclaration.fromXML(parseXML(xml));
}

function makeMultiSelectDecl(values = ['ChoiceA', 'ChoiceC']) {
  const xml = `
    <qti-response-declaration identifier="RESPONSE" base-type="identifier" cardinality="multiple">
      <qti-correct-response>
        ${values.map(v => `<qti-value>${v}</qti-value>`).join('')}
      </qti-correct-response>
    </qti-response-declaration>
  `.trim();
  return QTIDeclaration.fromXML(parseXML(xml));
}

// ---------------------------------------------------------------------------
// QTIDeclaration.forType()
// ---------------------------------------------------------------------------

describe('QTIDeclaration.forType', () => {
  it('creates correct shape for singleSelect', () => {
    const d = QTIDeclaration.forType(QuestionType.SINGLE_SELECT);
    expect(d.baseType).toBe('identifier');
    expect(d.cardinality).toBe('single');
    expect(d.tag).toBe('qti-response-declaration');
  });

  it('creates correct shape for multiSelect', () => {
    const d = QTIDeclaration.forType(QuestionType.MULTI_SELECT);
    expect(d.baseType).toBe('identifier');
    expect(d.cardinality).toBe('multiple');
  });

  it('uses the supplied identifier', () => {
    const d = QTIDeclaration.forType(QuestionType.SINGLE_SELECT, 'Q1');
    expect(d.identifier).toBe('Q1');
  });

  it('defaults identifier to RESPONSE', () => {
    const d = QTIDeclaration.forType(QuestionType.SINGLE_SELECT);
    expect(d.identifier).toBe('RESPONSE');
  });

  it('starts with no capabilities', () => {
    const d = QTIDeclaration.forType(QuestionType.SINGLE_SELECT);
    expect(d.correctResponse).toBeNull();
    expect(d.mapping).toBeNull();
  });

  it('throws for an unknown question type', () => {
    expect(() => QTIDeclaration.forType('unknownType')).toThrow('Unknown question type');
  });
});

// ---------------------------------------------------------------------------
// QTIDeclaration.convertTo() — same base-type (identifier ↔ identifier)
// ---------------------------------------------------------------------------

describe('QTIDeclaration.convertTo — compatible base-type', () => {
  describe('singleSelect → multiSelect (upgrade)', () => {
    it('sets cardinality to multiple', () => {
      const converted = makeSingleSelectDecl().convertTo(QuestionType.MULTI_SELECT);
      expect(converted.cardinality).toBe('multiple');
    });

    it('preserves base-type', () => {
      const converted = makeSingleSelectDecl().convertTo(QuestionType.MULTI_SELECT);
      expect(converted.baseType).toBe('identifier');
    });

    it('preserves correctResponse value', () => {
      const converted = makeSingleSelectDecl(['ChoiceA']).convertTo(QuestionType.MULTI_SELECT);
      expect(converted.correctResponse).toEqual(['ChoiceA']);
    });

    it('preserves identifier', () => {
      const converted = makeSingleSelectDecl().convertTo(QuestionType.MULTI_SELECT);
      expect(converted.identifier).toBe('RESPONSE');
    });

    it('preserves mapping when base-type is unchanged', () => {
      const xml = `
        <qti-response-declaration identifier="RESPONSE" base-type="identifier" cardinality="single">
          <qti-correct-response><qti-value>ChoiceA</qti-value></qti-correct-response>
          <qti-mapping default-value="0">
            <qti-map-entry map-key="ChoiceA" mapped-value="1"/>
            <qti-map-entry map-key="ChoiceB" mapped-value="-0.5"/>
          </qti-mapping>
        </qti-response-declaration>
      `.trim();
      const d = QTIDeclaration.fromXML(parseXML(xml));
      const converted = d.convertTo(QuestionType.MULTI_SELECT);
      expect(converted.mapping).not.toBeNull();
      expect(converted.mapping.entries).toHaveLength(2);
    });
  });

  describe('multiSelect → singleSelect (downgrade)', () => {
    it('sets cardinality to single', () => {
      const converted = makeMultiSelectDecl().convertTo(QuestionType.SINGLE_SELECT);
      expect(converted.cardinality).toBe('single');
    });

    it('keeps only the first correctResponse value by default', () => {
      const converted = makeMultiSelectDecl(['ChoiceA', 'ChoiceC']).convertTo(
        QuestionType.SINGLE_SELECT,
      );
      expect(converted.correctResponse).toEqual(['ChoiceA']);
    });

    it('drops all correctResponse values when keepFirst is false', () => {
      const converted = makeMultiSelectDecl(['ChoiceA', 'ChoiceC']).convertTo(
        QuestionType.SINGLE_SELECT,
        { keepFirst: false },
      );
      expect(converted.correctResponse).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('converts a declaration with no correctResponse without throwing', () => {
      const d = QTIDeclaration.forType(QuestionType.SINGLE_SELECT);
      const converted = d.convertTo(QuestionType.MULTI_SELECT);
      expect(converted.correctResponse).toBeNull();
    });

    it('does not mutate the original declaration', () => {
      const original = makeSingleSelectDecl(['ChoiceA']);
      original.convertTo(QuestionType.MULTI_SELECT);
      expect(original.cardinality).toBe('single');
      expect(original.correctResponse).toEqual(['ChoiceA']);
    });

    it('converted declaration serializes valid XML', () => {
      const converted = makeMultiSelectDecl(['ChoiceA', 'ChoiceC']).convertTo(
        QuestionType.SINGLE_SELECT,
      );
      const xml = serializer.serializeToString(converted.getXML());
      expect(xml).toContain('cardinality="single"');
      expect(xml).toContain('base-type="identifier"');
      expect(xml).toContain('ChoiceA');
    });

    it('throws when converting to an unknown question type', () => {
      const d = makeSingleSelectDecl();
      expect(() => d.convertTo('unknownType')).toThrow('Unknown question type');
    });
  });
});

// ---------------------------------------------------------------------------
// fromPlain — direct capability registration without XML
// ---------------------------------------------------------------------------

describe('CorrectResponse.fromPlain', () => {
  it('registers the capability and exposes values via getter', () => {
    const d = QTIDeclaration.forType(QuestionType.SINGLE_SELECT);
    CorrectResponse.fromPlain(['ChoiceB'], d);
    expect(d.correctResponse).toEqual(['ChoiceB']);
  });

  it('overwrites an existing correctResponse capability', () => {
    const d = makeSingleSelectDecl(['ChoiceA']);
    CorrectResponse.fromPlain(['ChoiceB'], d);
    expect(d.correctResponse).toEqual(['ChoiceB']);
  });
});

describe('Mapping.fromPlain', () => {
  it('registers the capability and exposes data via getter', () => {
    const d = QTIDeclaration.forType(QuestionType.SINGLE_SELECT);
    const data = {
      defaultValue: 0,
      lowerBound: null,
      upperBound: null,
      entries: [{ mapKey: 'ChoiceA', mappedValue: 1, caseSensitive: true }],
    };
    Mapping.fromPlain(data, d);
    expect(d.mapping.entries).toHaveLength(1);
    expect(d.mapping.defaultValue).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// interactionSchema helpers
// ---------------------------------------------------------------------------

describe('getSchemaForType', () => {
  it('returns the correct schema for singleSelect', () => {
    const schema = getSchemaForType(QuestionType.SINGLE_SELECT);
    expect(schema.baseType).toBe('identifier');
    expect(schema.cardinality).toBe('single');
    expect(schema.interaction).toBe('qti-choice-interaction');
  });

  it('returns the correct schema for multiSelect', () => {
    const schema = getSchemaForType(QuestionType.MULTI_SELECT);
    expect(schema.cardinality).toBe('multiple');
  });

  it('returns undefined for an unknown type', () => {
    expect(getSchemaForType('bogus')).toBeUndefined();
  });
});

describe('isBaseTypeCompatible', () => {
  it('returns true for singleSelect ↔ multiSelect', () => {
    expect(isBaseTypeCompatible(QuestionType.SINGLE_SELECT, QuestionType.MULTI_SELECT)).toBe(true);
    expect(isBaseTypeCompatible(QuestionType.MULTI_SELECT, QuestionType.SINGLE_SELECT)).toBe(true);
  });

  it('returns false when either type is unknown', () => {
    expect(isBaseTypeCompatible('bogus', QuestionType.SINGLE_SELECT)).toBe(false);
    expect(isBaseTypeCompatible(QuestionType.SINGLE_SELECT, 'bogus')).toBe(false);
  });
});
