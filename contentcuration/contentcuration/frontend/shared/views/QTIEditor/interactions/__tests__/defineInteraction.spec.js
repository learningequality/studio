import defineInteraction from '../defineInteraction';

// A minimal valid descriptor with all required keys present.
const makeValidDescriptor = (overrides = {}) => ({
  type: 'test',
  placement: 'block',
  questionTypes: [],
  editorComponent: {},
  convertsFrom: [],
  matches: () => false,
  getQuestionType: () => null,
  getDeclarationSchema: () => ({ baseType: 'string', cardinality: 'single' }),
  parse: () => ({}),
  validate: () => [],
  ...overrides,
});

describe('defineInteraction', () => {
  it('returns the descriptor unchanged when all required keys are present', () => {
    const descriptor = makeValidDescriptor();
    expect(defineInteraction(descriptor)).toBe(descriptor);
  });

  const REQUIRED_KEYS = [
    'type',
    'placement',
    'questionTypes',
    'editorComponent',
    'convertsFrom',
    'matches',
    'getQuestionType',
    'getDeclarationSchema',
    'parse',
    'validate',
  ];

  it.each(REQUIRED_KEYS)('throws when the required key "%s" is missing', key => {
    const descriptor = makeValidDescriptor();
    delete descriptor[key];
    expect(() => defineInteraction(descriptor)).toThrow(
      new RegExp(`missing required key "${key}"`, 'i'),
    );
  });

  it('includes the descriptor type in the error message when type is present', () => {
    const descriptor = makeValidDescriptor({ type: 'myPlugin' });
    delete descriptor.editorComponent;
    expect(() => defineInteraction(descriptor)).toThrow(/myPlugin/);
  });

  it('uses "(unknown)" in the error message when type is also missing', () => {
    const descriptor = makeValidDescriptor();
    delete descriptor.type;
    delete descriptor.editorComponent;
    expect(() => defineInteraction(descriptor)).toThrow(/\(unknown\)/);
  });
});
