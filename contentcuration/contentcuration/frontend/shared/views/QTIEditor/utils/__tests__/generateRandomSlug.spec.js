import { generateRandomSlug } from '../generateRandomSlug';

describe('generateRandomSlug', () => {
  it('returns a string starting with the given prefix', () => {
    expect(generateRandomSlug('choice')).toMatch(/^choice_/);
    expect(generateRandomSlug('response')).toMatch(/^response_/);
  });

  it('appends exactly 8 alphanumeric characters after the prefix', () => {
    const result = generateRandomSlug('choice');
    const suffix = result.replace('choice_', '');
    expect(suffix).toHaveLength(8);
    expect(suffix).toMatch(/^[a-z0-9]{8}$/);
  });

  it('generates unique values on successive calls', () => {
    const results = new Set(Array.from({ length: 50 }, () => generateRandomSlug('x')));
    expect(results.size).toBe(50);
  });
});
