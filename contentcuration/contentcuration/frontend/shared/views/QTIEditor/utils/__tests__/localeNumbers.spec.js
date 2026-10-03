import { formatLocaleNumber, readLocaleNumber } from '../localeNumbers';
import { LanguagesList } from 'shared/leUtils/Languages';

describe('readLocaleNumber', () => {
  it('reads French separators', () => {
    [
      ['1,5', '1.5'],
      ['1,234', '1.234'],
      ['1 234,5', '1234.5'],
      ['1 234,5', '1234.5'],
      ['1 234,5', '1234.5'],
      ['-0,5', '-0.5'],
    ].forEach(([text, value]) => expect(readLocaleNumber(text, 'fr')).toBe(value));
  });

  it('reads English separators', () => {
    [
      ['1,234', '1234'],
      ['1,234.5', '1234.5'],
      ['1,234,567', '1234567'],
      ['1,23', '123'],
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

  it.each([
    ['pa', '੩੦'],
    ['gu', '૩૦'],
    ['ta', '௩௦'],
    ['te', '౩౦'],
    ['kn', '೩೦'],
    ['ml', '൩൦'],
    ['th', '๓๐'],
    ['bo', '༣༠'],
    ['km', '៣០'],
    ['lo', '໓໐'],
    ['ur', '۳۰'],
  ])('reads %s digits (%s)', (language, text) => {
    expect(readLocaleNumber(text, language)).toBe('30');
  });

  it('reads Arabic separators in Arabic, whose conventions are Latin', () => {
    [
      ['٣٫٥', '3.5'],
      ['١٬٢٣٤٫٥', '1234.5'],
      ['1٫5', '1.5'],
      ['1٬234٫5', '1234.5'],
    ].forEach(([text, value]) => expect(readLocaleNumber(text, 'ar')).toBe(value));
  });

  it.each([
    ['ur', '۱۲۳۴٫۵'],
    ['ur-PK', '۱٬۲۳۴٫۵'],
    ['ur', '۱۲۳۴.۵'],
    ['fa', '۱٬۲۳۴٫۵'],
    ['fa', '1234٫5'],
    ['ps', '1٬234٫5'],
    ['ks', '1234٫5'],
  ])('reads Extended Arabic-Indic decimals in %s (%s)', (language, text) => {
    expect(readLocaleNumber(text, language)).toBe('1234.5');
  });

  it.each([
    ['en', '๓๐'],
    ['ar', '๑๒'],
    ['en', '𝟑𝟎'],
    ['en', '1٣'],
    ['en', '1٫5'],
  ])('rejects digits or separators outside %s numbering systems (%s)', (language, text) => {
    expect(readLocaleNumber(text, language)).toBeNull();
  });

  it.each([
    ['ar', '1٣', '13'],
    ['ar-EG', '٧٫٥٠1', '7.501'],
    ['th', '1๓', '13'],
    ['fa', '۷٫۵1', '7.51'],
    ['bn', '1৭.৫', '17.5'],
    ['my', '၇.၅1', '7.51'],
  ])('reads ASCII digits mixed with %s digits (%s)', (language, text, value) => {
    expect(readLocaleNumber(text, language)).toBe(value);
  });

  it.each(['fa', 'prs', 'pbu', 'ps', 'ks', 'ne', 'ne-NP', 'mr', 'sa', 'bho', 'bn', 'as', 'my'])(
    'reads %s answers edited with ASCII digits',
    language => {
      const shown = formatLocaleNumber('7.5', language);
      expect(readLocaleNumber(`${shown}1`, language)).toBe('7.51');
      expect(readLocaleNumber(`1${shown}`, language)).toBe('17.5');
    },
  );

  it('reads xsd:double the language cannot read', () => {
    [
      ['1.5', 'fr'],
      ['1.50', 'fr'],
      ['1.5e+3', 'en'],
      ['3.5', 'ar-EG'],
    ].forEach(([text, language]) => expect(readLocaleNumber(text, language)).toBe(text));
  });

  it('reads an xsd:double decimal as typed where the group separator is a period', () => {
    ['de', 'es', 'pt', 'pt-BR', 'it', 'id', 'tr', 'vi'].forEach(language =>
      ['0.5', '3.14', '-1.5', '1.2345', '0.125', '-0.125', '.125'].forEach(text =>
        expect(readLocaleNumber(text, language)).toBe(text),
      ),
    );
  });

  it('reads a period followed by three digits as grouping where the language groups with it', () => {
    expect(readLocaleNumber('1.234', 'de')).toBe('1234');
    expect(readLocaleNumber('1.234,5', 'de')).toBe('1234.5');
  });

  it('stores what the language reads as the canonical xsd:double', () => {
    [
      ['1,50', '1.5'],
      ['007', '7'],
      ['-0', '0'],
      ['0,0000001', '0.0000001'],
      ['1000000000000000000000', '1000000000000000000000'],
    ].forEach(([text, value]) => expect(readLocaleNumber(text, 'fr')).toBe(value));
  });

  it('reads a leading plus sign', () => {
    [
      ['+1,5', 'fr', '1.5'],
      ['+1,5', 'de', '1.5'],
      ['+1,234', 'en', '1234'],
    ].forEach(([text, language, value]) => expect(readLocaleNumber(text, language)).toBe(value));
  });

  it('rejects text that is not a number', () => {
    ['', '-', '+', '+-1', 'e', '1e', 'one', ',', '1,2,3', '1e400', '0x10', 'Infinity'].forEach(
      text => expect(readLocaleNumber(text, 'fr')).toBeNull(),
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

  it('keeps the stored form', () => {
    expect(formatLocaleNumber('1.50', 'en')).toBe('1.50');
    expect(formatLocaleNumber('1.50', 'fr')).toBe('1,50');
    expect(formatLocaleNumber('0012', 'en')).toBe('0012');
    expect(formatLocaleNumber('123456789012345678', 'en')).toBe('123456789012345678');
  });

  it('uses the language digits', () => {
    expect(formatLocaleNumber('30', 'ar-EG')).toBe('٣٠');
    expect(formatLocaleNumber('30', 'hi')).toBe('30');
  });

  it('writes the minus without bidi marks, which would move it right in an ltr field', () => {
    expect(formatLocaleNumber('-0.5', 'ar-EG')).toBe('-٠٫٥');
    expect(formatLocaleNumber('-0.5', 'ckb')).toBe('-٠٫٥');
    expect(formatLocaleNumber('-0.5', 'fa')).toBe('−۰٫۵');
  });

  it('returns the value unchanged without a language', () => {
    expect(formatLocaleNumber('1234.5', '')).toBe('1234.5');
  });

  it('leaves a stored value that is not an xsd:double unchanged', () => {
    expect(formatLocaleNumber('1.2.3', 'ar-EG')).toBe('1.2.3');
    expect(formatLocaleNumber('1 234', 'fa')).toBe('1 234');
  });

  it('leaves a value with an exponent unchanged', () => {
    [
      ['6.022e23', 'en'],
      ['3e8', 'ar-EG'],
      ['1e-50', 'fr'],
      ['1E300', 'de'],
    ].forEach(([value, language]) => expect(formatLocaleNumber(value, language)).toBe(value));
  });

  it('leaves a value unchanged when the language cannot read its formatting back', () => {
    expect(formatLocaleNumber('0.5', 'sd')).toBe('0.5');
  });

  it('reads back every canonical stored value unchanged', () => {
    LanguagesList.forEach(({ id: language }) =>
      ['0', '-0.5', '1234.5', '1e+21', '1e-7', '1e-25', '0.30000000000000004'].forEach(value =>
        expect(readLocaleNumber(formatLocaleNumber(value, language), language)).toBe(value),
      ),
    );
  });
});
