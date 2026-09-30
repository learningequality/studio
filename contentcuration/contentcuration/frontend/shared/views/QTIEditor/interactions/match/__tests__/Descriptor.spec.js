import { matchInteractionDescriptor as descriptor } from '../Descriptor';
import { QuestionType } from '../../../constants';
import { MATCH_XML, MATCH_DECL_XML } from '../../../utils/testingFixtures';

describe('MatchInteractionDescriptor', () => {
  it('buildXML() forwards its own declaration schema', () => {
    const state = descriptor.parse(MATCH_XML, [MATCH_DECL_XML]);
    const [declXml] = descriptor.buildXML(state, QuestionType.MATCH).responseDeclarations;
    expect(declXml).toContain('base-type="directedPair"');
    expect(declXml).toContain('cardinality="multiple"');
  });
});
