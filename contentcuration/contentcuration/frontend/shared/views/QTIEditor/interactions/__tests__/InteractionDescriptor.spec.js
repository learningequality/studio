import { InteractionDescriptor } from '../InteractionDescriptor';
import { Placement, QtiInteraction, QuestionType } from '../../constants';

const IMPLEMENTED = {
  getQuestionType: () => QuestionType.SINGLE_SELECT,
  getResponseDeclarationSchema: () => ({}),
  parse: () => ({}),
  buildXML: () => ({ bodyXml: '', responseDeclarations: [] }),
  validate: () => [],
};

/** Builds a subclass implementing everything except the listed methods. */
function makeDescriptorClass({ omit = [], options } = {}) {
  class TestDescriptor extends InteractionDescriptor {
    constructor() {
      super(
        options ?? {
          type: QtiInteraction.CHOICE,
          questionTypes: [QuestionType.SINGLE_SELECT],
        },
      );
    }
  }
  for (const [name, fn] of Object.entries(IMPLEMENTED)) {
    if (!omit.includes(name)) {
      TestDescriptor.prototype[name] = fn;
    }
  }
  return TestDescriptor;
}

describe('InteractionDescriptor', () => {
  it('constructs when the subclass implements the contract', () => {
    const Descriptor = makeDescriptorClass();
    const descriptor = new Descriptor();

    expect(descriptor.type).toBe(QtiInteraction.CHOICE);
    expect(descriptor.questionTypes).toEqual([QuestionType.SINGLE_SELECT]);
  });

  it('names every method the subclass failed to implement', () => {
    const Descriptor = makeDescriptorClass({ omit: ['parse', 'validate'] });

    expect(() => new Descriptor()).toThrow(/missing required method\(s\) parse, validate/);
  });

  it('requires a type', () => {
    const Descriptor = makeDescriptorClass({
      options: { questionTypes: [QuestionType.SINGLE_SELECT] },
    });

    expect(() => new Descriptor()).toThrow(/type is required/);
  });

  it('places an interaction in the body as a block unless told otherwise', () => {
    expect(new (makeDescriptorClass())().placement).toBe(Placement.BLOCK);

    const Inline = makeDescriptorClass({
      options: {
        type: QtiInteraction.TEXT_ENTRY,
        questionTypes: [QuestionType.TEXT_ENTRY],
        placement: Placement.INLINE,
      },
    });
    expect(new Inline().placement).toBe(Placement.INLINE);
  });

  it('rejects a placement it does not know', () => {
    const Descriptor = makeDescriptorClass({
      options: {
        type: QtiInteraction.CHOICE,
        questionTypes: [QuestionType.SINGLE_SELECT],
        placement: 'floating',
      },
    });

    expect(() => new Descriptor()).toThrow(/placement must be one of/);
  });

  it('requires at least one question type', () => {
    const Descriptor = makeDescriptorClass({
      options: { type: QtiInteraction.CHOICE, questionTypes: [] },
    });

    expect(() => new Descriptor()).toThrow(/at least one question type/);
  });

  describe('defaults', () => {
    it('matches the element whose tag name is the interaction type', () => {
      const descriptor = new (makeDescriptorClass())();
      const matching = { tagName: 'QTI-CHOICE-INTERACTION' };
      const other = { tagName: 'QTI-ORDER-INTERACTION' };

      expect(descriptor.matches(matching)).toBe(true);
      expect(descriptor.matches(other)).toBe(false);
    });

    it('contributes no question type options', () => {
      expect(new (makeDescriptorClass())().getTypeOptions()).toEqual([]);
    });
  });
});
