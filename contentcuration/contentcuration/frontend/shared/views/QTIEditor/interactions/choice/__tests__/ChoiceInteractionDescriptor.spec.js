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

  it('derives singleSelect from declaration cardinality="single"', () => {
    const descriptor = new ChoiceInteractionDescriptor();
    const el = new DOMParser().parseFromString(
      '<qti-choice-interaction max-choices="1" />',
      'text/xml',
    ).documentElement;
    const declarations = [
      '<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier"/>',
    ];
    expect(descriptor.getQuestionType(el, declarations)).toBe(QuestionType.SINGLE_SELECT);
  });

  it('derives multiSelect from declaration cardinality="multiple"', () => {
    const descriptor = new ChoiceInteractionDescriptor();
    const el = new DOMParser().parseFromString(
      '<qti-choice-interaction max-choices="2" />',
      'text/xml',
    ).documentElement;
    const declarations = [
      '<qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="identifier"/>',
    ];
    expect(descriptor.getQuestionType(el, declarations)).toBe(QuestionType.MULTI_SELECT);
  });

  it('falls back to max-choices when no declarations are provided', () => {
    const descriptor = new ChoiceInteractionDescriptor();
    const el = new DOMParser().parseFromString(
      '<qti-choice-interaction max-choices="1" />',
      'text/xml',
    ).documentElement;
    expect(descriptor.getQuestionType(el)).toBe(QuestionType.SINGLE_SELECT);
  });

  it('returns single-cardinality schema for singleSelect', () => {
    const descriptor = new ChoiceInteractionDescriptor();
    const schema = descriptor.getResponseDeclarationSchema(QuestionType.SINGLE_SELECT);
    expect(schema.baseType).toBe(BaseType.IDENTIFIER);
    expect(schema.cardinality).toBe(Cardinality.SINGLE);
  });

  it('returns multiple-cardinality schema for multiSelect', () => {
    const descriptor = new ChoiceInteractionDescriptor();
    const schema = descriptor.getResponseDeclarationSchema(QuestionType.MULTI_SELECT);
    expect(schema.baseType).toBe(BaseType.IDENTIFIER);
    expect(schema.cardinality).toBe(Cardinality.MULTIPLE);
  });
});
