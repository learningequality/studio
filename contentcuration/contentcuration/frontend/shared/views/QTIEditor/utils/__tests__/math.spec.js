import { floatOrIntRegex } from '../math';

describe('floatOrIntRegex', () => {
  it('tests true for valid values', () => {
    [
      '1.5', // Float
      '-4.5', // Signed Float
      '+1', // Signed Int
      '10e5', // Exponentiation
      '-15.3e5', // Combo
      '-12345.67890e98', // Combo 2
    ].forEach(v => expect(floatOrIntRegex.test(v)).toBe(true));
  });

  it('tests false for invalid values', () => {
    [
      'i * 1.5', // Math
      'one.point.five', // Text
      '10 5 0 100', // Spaces
      '1.2.3.4', // IP
    ].forEach(v => expect(floatOrIntRegex.test(v)).toBe(false));
  });
});
