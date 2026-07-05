import { ChoiceInteractionDescriptor } from '../ChoiceInteractionDescriptor';
import { BaseType, Cardinality, QtiInteraction, QuestionType } from '../../../constants';

describe('ChoiceInteractionDescriptor', () => {
  it('owns the choice interaction metadata without requiring the Vue editor', () => {
    const descriptor = new ChoiceInteractionDescriptor();
    expect(descriptor.type).toBe(QtiInteraction.CHOICE);
    expect(descriptor.questionTypes).toEqual([
      QuestionType.SINGLE_SELECT,
      QuestionType.MULTI_SELECT,
    ]);
  });

  it('derives singleSelect from max-choices="1"', () => {
    const descriptor = new ChoiceInteractionDescriptor();
    const el = new DOMParser().parseFromString(
      '<qti-choice-interaction max-choices="1" />',
      'text/xml',
    ).documentElement;
    expect(descriptor.getQuestionType(el)).toBe(QuestionType.SINGLE_SELECT);
  });

  it('returns single-cardinality schema for singleSelect', () => {
    const descriptor = new ChoiceInteractionDescriptor();
    const schema = descriptor.getDeclarationSchema(QuestionType.SINGLE_SELECT);
    expect(schema.baseType).toBe(BaseType.IDENTIFIER);
    expect(schema.cardinality).toBe(Cardinality.SINGLE);
  });

  it('returns multiple-cardinality schema for multiSelect', () => {
    const descriptor = new ChoiceInteractionDescriptor();
    const schema = descriptor.getDeclarationSchema(QuestionType.MULTI_SELECT);
    expect(schema.baseType).toBe(BaseType.IDENTIFIER);
    expect(schema.cardinality).toBe(Cardinality.MULTIPLE);
  });
});
