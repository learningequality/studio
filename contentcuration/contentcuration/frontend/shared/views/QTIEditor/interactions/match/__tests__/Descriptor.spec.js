import { matchInteractionDescriptor as descriptor } from '../Descriptor';
import { qtiEditorStrings } from '../../../qtiEditorStrings';
import { QuestionType } from '../../../constants';
import { MATCH_XML, MATCH_DECL_XML } from '../../../utils/testingFixtures';

describe('MatchInteractionDescriptor', () => {
  it('getTypeOptions() offers the match question type to the type selector', () => {
    const options = descriptor.getTypeOptions(qtiEditorStrings);
    expect(options).toHaveLength(1);
    expect(options[0].value).toBe(QuestionType.MATCH);
    expect(options[0].label).toBe(qtiEditorStrings.$tr('matchLabel'));
  });

  it('buildXML() forwards its own declaration schema', () => {
    const state = descriptor.parse(MATCH_XML, [MATCH_DECL_XML]);
    const [declXml] = descriptor.buildXML(state, QuestionType.MATCH).responseDeclarations;
    expect(declXml).toContain('base-type="directedPair"');
    expect(declXml).toContain('cardinality="multiple"');
  });
});
