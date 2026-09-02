import { associateInteractionDescriptor as descriptor } from '../AssociateInteractionDescriptor';
import { parseXML } from '../../../serialization/parseItem';
import { qtiEditorStrings } from '../../../qtiEditorStrings';
import { QtiInteraction, QuestionType } from '../../../constants';
import {
  ASSOCIATE_XML,
  ASSOCIATE_DECL_XML,
  ORDERING_XML,
  CHOICE_SINGLE_SELECT_XML,
} from '../../../utils/testingFixtures';

const elementOf = xml => parseXML(xml).documentElement;

describe('AssociateInteractionDescriptor', () => {
  it('declares the associate interaction tag, block placement, and question type', () => {
    expect(descriptor.type).toBe(QtiInteraction.ASSOCIATE);
    expect(descriptor.placement).toBe('block');
    expect(descriptor.questionTypes).toEqual([QuestionType.ASSOCIATE]);
  });

  describe('matches()', () => {
    it('matches a <qti-associate-interaction> element', () => {
      expect(descriptor.matches(elementOf(ASSOCIATE_XML))).toBe(true);
    });

    it('does not match other interaction elements', () => {
      expect(descriptor.matches(elementOf(ORDERING_XML))).toBe(false);
      expect(descriptor.matches(elementOf(CHOICE_SINGLE_SELECT_XML))).toBe(false);
    });
  });

  it('getQuestionType() returns the associate question type', () => {
    expect(descriptor.getQuestionType()).toBe(QuestionType.ASSOCIATE);
  });

  it('getTypeOptions() offers the associate question type to the type selector', () => {
    const options = descriptor.getTypeOptions(qtiEditorStrings);
    expect(options).toHaveLength(1);
    expect(options[0].value).toBe(QuestionType.ASSOCIATE);
    expect(options[0].label).toBe(qtiEditorStrings.$tr('associateLabel'));
  });

  it('buildXML() forwards its own declaration schema', () => {
    const state = descriptor.parse(ASSOCIATE_XML, [ASSOCIATE_DECL_XML]);
    const [declXml] = descriptor.buildXML(state, QuestionType.ASSOCIATE).responseDeclarations;
    expect(declXml).toContain('base-type="pair"');
    expect(declXml).toContain('cardinality="multiple"');
  });
});
