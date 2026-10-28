import { associateInteractionDescriptor as descriptor } from '../Descriptor';
import { qtiEditorStrings } from '../../../qtiEditorStrings';
import { QuestionType } from '../../../constants';
import { ASSOCIATE_XML, ASSOCIATE_DECL_XML } from '../../../utils/testingFixtures';

describe('AssociateInteractionDescriptor', () => {
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
