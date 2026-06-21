import { QTISanitizer } from '../QTISanitizer.js';

describe('QTISanitizer.validateBaseType', () => {
  it.each([
    'boolean',
    'float',
    'identifier',
    'integer',
    'string',
    'point',
    'pair',
    'directedPair',
    'duration',
    'file',
    'uri',
  ])('accepts valid base-type "%s"', bt => expect(QTISanitizer.validateBaseType(bt)).toBe(bt));

  it('throws for an unknown base-type', () => {
    expect(() => QTISanitizer.validateBaseType('foo')).toThrow('invalid base-type');
  });

  it('throws for an empty string', () => {
    expect(() => QTISanitizer.validateBaseType('')).toThrow();
  });

  it('returns null/undefined unchanged (base-type is optional on outcome declarations)', () => {
    expect(QTISanitizer.validateBaseType(null)).toBeNull();
    expect(QTISanitizer.validateBaseType(undefined)).toBeUndefined();
  });
});

describe('QTISanitizer.validateCardinality', () => {
  it.each(['single', 'multiple', 'ordered', 'record'])('accepts valid cardinality "%s"', c =>
    expect(QTISanitizer.validateCardinality(c)).toBe(c),
  );

  it('throws for an unknown cardinality', () => {
    expect(() => QTISanitizer.validateCardinality('many')).toThrow('invalid cardinality');
  });

  it('throws for an empty string', () => {
    expect(() => QTISanitizer.validateCardinality('')).toThrow();
  });
});

describe('QTISanitizer.validateIdentifier', () => {
  it('accepts a plain ASCII identifier', () => {
    expect(QTISanitizer.validateIdentifier('RESPONSE')).toBe('RESPONSE');
  });

  it('accepts identifiers starting with underscore', () => {
    expect(QTISanitizer.validateIdentifier('_choice1')).toBe('_choice1');
  });

  it('accepts identifiers with hyphens and dots', () => {
    expect(QTISanitizer.validateIdentifier('choice-A.1')).toBe('choice-A.1');
  });

  it('accepts non-ASCII Unicode identifiers (i18n item banks)', () => {
    expect(QTISanitizer.validateIdentifier('RÉSPONSE')).toBe('RÉSPONSE');
  });

  it('throws for an identifier starting with a digit', () => {
    expect(() => QTISanitizer.validateIdentifier('1choice')).toThrow('invalid QTI identifier');
  });

  it('throws for an identifier containing spaces', () => {
    expect(() => QTISanitizer.validateIdentifier('choice A')).toThrow();
  });

  it('throws for an empty string', () => {
    expect(() => QTISanitizer.validateIdentifier('')).toThrow();
  });

  it('throws for an identifier that is just a number', () => {
    expect(() => QTISanitizer.validateIdentifier('123')).toThrow();
  });
});

describe('QTISanitizer.stripTags — XSS defence', () => {
  it('passes through a plain string unchanged', () => {
    expect(QTISanitizer.stripTags('ChoiceA')).toBe('ChoiceA');
  });

  it('strips a simple <script> tag — script body is fully removed, not extracted', () => {
    // We do NOT want the script text — the element is removed entirely.
    expect(QTISanitizer.stripTags('<script>alert(1)</script>')).toBe('');
  });

  it('strips HTML bold tags and keeps text content', () => {
    expect(QTISanitizer.stripTags('<b>bold</b>')).toBe('bold');
  });

  it('strips nested tags', () => {
    expect(QTISanitizer.stripTags('<div><span>inner</span></div>')).toBe('inner');
  });

  it('handles img onerror XSS payload', () => {
    const payload = '<img src=x onerror=alert(1)>';
    // After stripping tags, no html remains — textContent of <img> is empty
    expect(QTISanitizer.stripTags(payload)).toBe('');
  });

  it('preserves non-ASCII text (i18n)', () => {
    expect(QTISanitizer.stripTags('选择甲')).toBe('选择甲');
  });

  it('preserves numbers', () => {
    expect(QTISanitizer.stripTags('3.14')).toBe('3.14');
  });

  it('preserves ampersand entity text (not HTML)', () => {
    // A raw `&` without a tag — not HTML injection, passes through
    expect(QTISanitizer.stripTags('A & B')).toBe('A & B');
  });

  it('handles non-string input by coercing to string', () => {
    expect(QTISanitizer.stripTags(42)).toBe('42');
    expect(QTISanitizer.stripTags(null)).toBe('');
  });
});

describe('QTISanitizer.parseFloat', () => {
  it('parses a string float', () => {
    expect(QTISanitizer.parseFloat('3.14')).toBe(3.14);
  });

  it('parses a string integer', () => {
    expect(QTISanitizer.parseFloat('0')).toBe(0);
  });

  it('parses a negative number', () => {
    expect(QTISanitizer.parseFloat('-0.5')).toBe(-0.5);
  });

  it('passes through a number', () => {
    expect(QTISanitizer.parseFloat(1)).toBe(1);
  });

  it('throws for NaN input', () => {
    expect(() => QTISanitizer.parseFloat('not-a-number')).toThrow('finite number');
  });

  it('throws for Infinity', () => {
    expect(() => QTISanitizer.parseFloat(Infinity)).toThrow();
  });

  it('includes the field name in the error', () => {
    expect(() => QTISanitizer.parseFloat('x', 'mapped-value')).toThrow('mapped-value');
  });
});

describe('QTISanitizer.sanitizeValues', () => {
  it('trims whitespace from each entry', () => {
    expect(QTISanitizer.sanitizeValues(['  A  ', 'B'])).toEqual(['A', 'B']);
  });

  it('strips HTML tags from each entry', () => {
    expect(QTISanitizer.sanitizeValues(['<b>Choice</b>', 'B'])).toEqual(['Choice', 'B']);
  });

  it('removes entries that are empty after sanitization', () => {
    expect(QTISanitizer.sanitizeValues(['<img src=x>', 'Valid'])).toEqual(['Valid']);
  });

  it('returns an empty array for an all-empty input', () => {
    expect(QTISanitizer.sanitizeValues(['<br/>', '  '])).toEqual([]);
  });

  it('preserves i18n values', () => {
    expect(QTISanitizer.sanitizeValues(['选择甲', 'اختيار'])).toEqual(['选择甲', 'اختيار']);
  });
});
