import { formatLocaleNumber, readLocaleNumber } from '../localeNumbers';

describe('readLocaleNumber', () => {
  it('reads French separators', () => {
    [
      ['1,5', '1.5'],
      ['1,234', '1.234'],
      ['1 234,5', '1234.5'],
      ['1\u202F234,5', '1234.5'],
      ['1\u00A0234,5', '1234.5'],
      ['-0,5', '-0.5'],
    ].forEach(([text, value]) => expect(readLocaleNumber(text, 'fr')).toBe(value));
  });

  it('reads English separators', () => {
    [
      ['1,234', '1234'],
      ['1,234.5', '1234.5'],
      ['1,234,567', '1234567'],
      ['1.5e+3', '1.5e+3'],
    ].forEach(([text, value]) => expect(readLocaleNumber(text, 'en')).toBe(value));
  });

  it('reads Hindi grouping and digits', () => {
    [
      ['12,34,567', '1234567'],
      ['३०', '30'],
    ].forEach(([text, value]) => expect(readLocaleNumber(text, 'hi')).toBe(value));
  });

  it('reads Arabic-Indic digits', () => {
    expect(readLocaleNumber('٣٠', 'ar')).toBe('30');
  });

  it('reads Arabic separators in Arabic, whose conventions are Latin', () => {
    [
      ['٣٫٥', '3.5'],
      ['١٬٢٣٤٫٥', '1234.5'],
    ].forEach(([text, value]) => expect(readLocaleNumber(text, 'ar')).toBe(value));
  });

  it('reads xsd:double the language cannot read', () => {
    [
      ['1.5', 'fr'],
      ['3.5', 'ar-EG'],
    ].forEach(([text, language]) => expect(readLocaleNumber(text, language)).toBe(text));
  });

  it('rejects a decimal point where the language groups with it', () => {
    [
      ['1.5', 'de'],
      ['1.23', 'de'],
      ['1.50', 'de'],
      ['0.5', 'es'],
      ['1.2345', 'it'],
    ].forEach(([text, language]) => expect(readLocaleNumber(text, language)).toBeNull());
    expect(readLocaleNumber('1.500', 'de')).toBe('1500');
  });

  it('rejects a leading group of zero', () => {
    [
      ['0,500', 'en'],
      ['0.500', 'de'],
      ['00 500', 'fr'],
    ].forEach(([text, language]) => expect(readLocaleNumber(text, language)).toBeNull());
  });

  it('rejects group separators where the language does not place them', () => {
    [
      ['1,23', 'en'],
      ['12,345,67', 'en'],
      ['1234,567', 'en'],
      [',123', 'en'],
      ['1,234,5', 'fr'],
      ['1,234,567', 'hi'],
      ['1,23,4', 'hi'],
      ['1 234.5', 'fr'],
      ['1.234,5', 'en'],
    ].forEach(([text, language]) => expect(readLocaleNumber(text, language)).toBeNull());
  });

  it('rejects text that is not a number', () => {
    ['', '-', 'e', '1e', 'one', ',', '1.2.3', '1e400'].forEach(text =>
      expect(readLocaleNumber(text, 'fr')).toBeNull(),
    );
  });

  it('reads only xsd:double without a language', () => {
    expect(readLocaleNumber('1.5', '')).toBe('1.5');
    expect(readLocaleNumber('1e+21', undefined)).toBe('1e+21');
    ['1,5', '1,234', '٣٠', '-'].forEach(text => expect(readLocaleNumber(text, '')).toBeNull());
  });
});

describe('formatLocaleNumber', () => {
  it('uses the language decimal separator without grouping', () => {
    expect(formatLocaleNumber('1234.5', 'fr')).toBe('1234,5');
    expect(formatLocaleNumber('1234.5', 'en')).toBe('1234.5');
    expect(formatLocaleNumber('1234.5', 'hi')).toBe('1234.5');
  });

  it('uses the language digits', () => {
    expect(formatLocaleNumber('30', 'ar-EG')).toBe('٣٠');
    expect(formatLocaleNumber('30', 'hi')).toBe('30');
  });

  it('returns the value unchanged without a language', () => {
    expect(formatLocaleNumber('1234.5', '')).toBe('1234.5');
  });

  it('leaves a stored value that is not an xsd:double unchanged', () => {
    expect(formatLocaleNumber('1.2.3', 'ar-EG')).toBe('1.2.3');
    expect(formatLocaleNumber('1 234', 'fa')).toBe('1 234');
  });

  it('reads back every valid stored form unchanged', () => {
    ['en', 'fr', 'de', 'hi', 'ar', 'ar-EG', 'fa'].forEach(language =>
      ['0', '-0.5', '1234.5', '1e+21', '1e-7', '1.50', '+5', '.5', '5.', '007', '1.5E3'].forEach(
        value =>
          expect(readLocaleNumber(formatLocaleNumber(value, language), language)).toBe(value),
      ),
    );
  });

  it('keeps an invalid stored form the language cannot read', () => {
    [
      ['1.2.3', 'ar-EG'],
      ['1 234', 'fa'],
      ['abc', 'fr'],
      ['1,23', 'en'],
    ].forEach(([value, language]) =>
      expect(readLocaleNumber(formatLocaleNumber(value, language), language)).toBeNull(),
    );
  });
});
