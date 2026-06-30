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

  it('creates single-cardinality declarations for singleSelect', () => {
    const descriptor = new ChoiceInteractionDescriptor();
    const declaration = descriptor.createDeclaration(QuestionType.SINGLE_SELECT, 'RESPONSE');
    expect(declaration.identifier).toBe('RESPONSE');
    expect(declaration.baseType).toBe(BaseType.IDENTIFIER);
    expect(declaration.cardinality).toBe(Cardinality.SINGLE);
  });

  it('creates multiple-cardinality declarations for multiSelect', () => {
    const descriptor = new ChoiceInteractionDescriptor();
    const declaration = descriptor.createDeclaration(QuestionType.MULTI_SELECT, 'RESPONSE');
    expect(declaration.baseType).toBe(BaseType.IDENTIFIER);
    expect(declaration.cardinality).toBe(Cardinality.MULTIPLE);
  });
});
