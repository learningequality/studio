import defineInteraction from '../defineInteraction';

// A minimal valid descriptor with all required keys except editorComponent,
// which is now always supplied as the second argument to defineInteraction.
const makeValidDescriptor = (overrides = {}) => ({
  type: 'test',
  placement: 'block',
  questionTypes: [],
  convertsFrom: [],
  matches: () => false,
  getQuestionType: () => null,
  getResponseDeclarationSchema: () => ({ baseType: 'string', cardinality: 'single' }),
  parse: () => ({}),
  buildXML: () => ({ bodyXml: '', responseDeclarations: [] }),
  validate: () => [],
  ...overrides,
});

const STUB_COMPONENT = {};

describe('defineInteraction', () => {
  it('returns the descriptor unchanged when all required keys are present', () => {
    const descriptor = makeValidDescriptor();
    expect(defineInteraction(descriptor, STUB_COMPONENT)).toBe(descriptor);
  });

  it('attaches the editorComponent from the second argument onto the descriptor', () => {
    const descriptor = makeValidDescriptor();
    const component = { name: 'MyEditor' };
    defineInteraction(descriptor, component);
    expect(descriptor.editorComponent).toBe(component);
  });

  // Keys that must be present on the descriptor itself (editorComponent is injected
  // by defineInteraction from the second argument, so it is excluded here).
  const REQUIRED_DESCRIPTOR_KEYS = [
    'type',
    'placement',
    'questionTypes',
    'convertsFrom',
    'matches',
    'getQuestionType',
    'getResponseDeclarationSchema',
    'parse',
    'buildXML',
    'validate',
  ];

  it.each(REQUIRED_DESCRIPTOR_KEYS)('throws when the required key "%s" is missing', key => {
    const descriptor = makeValidDescriptor();
    delete descriptor[key];
    expect(() => defineInteraction(descriptor, STUB_COMPONENT)).toThrow(
      new RegExp(`missing required key "${key}"`, 'i'),
    );
  });

  it('throws when editorComponent is not passed as the second argument', () => {
    const descriptor = makeValidDescriptor();
    // Calling with no second arg means editorComponent is undefined — still flagged.
    expect(() => defineInteraction(descriptor)).toThrow(/missing required key "editorComponent"/i);
  });

  it('includes the descriptor type in the error message when type is present', () => {
    const descriptor = makeValidDescriptor({ type: 'myPlugin' });
    delete descriptor.buildXML; // delete a different key to trigger the error
    expect(() => defineInteraction(descriptor, STUB_COMPONENT)).toThrow(/myPlugin/);
  });

  it('uses "(unknown)" in the error message when type is also missing', () => {
    const descriptor = makeValidDescriptor();
    delete descriptor.type;
    delete descriptor.buildXML;
    expect(() => defineInteraction(descriptor, STUB_COMPONENT)).toThrow(/\(unknown\)/);
  });
});
