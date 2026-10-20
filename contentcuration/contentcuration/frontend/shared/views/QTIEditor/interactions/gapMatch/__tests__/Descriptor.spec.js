import { gapMatchInteractionDescriptor as descriptor } from '../Descriptor';
import { getGaps } from '../parse';
import { isSupportedItem, resolveDescriptor } from '../../resolveDescriptor';
import { parseItem } from '../../../serialization/parseItem';
import { parseXML } from '../../../serialization/xml';
import { Placement, QtiInteraction, QuestionType } from '../../../constants';
import { qtiEditorStrings } from '../../../qtiEditorStrings';

const ITEM = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="item_k2lm9qaz" title="Question" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="directedPair">
    <qti-correct-response>
      <qti-value>choice_w1n7erxx gap_a1b2c3d4</qti-value>
      <qti-value>choice_s9r1ngxx gap_e5f6g7h8</qti-value>
    </qti-correct-response>
  </qti-response-declaration>
  <qti-item-body>
    <qti-gap-match-interaction response-identifier="RESPONSE" shuffle="true" max-associations="2">
      <qti-prompt><p>Identify the missing words.</p></qti-prompt>
      <qti-gap-text identifier="choice_w1n7erxx" match-max="1">winter</qti-gap-text>
      <qti-gap-text identifier="choice_s9r1ngxx" match-max="1">spring</qti-gap-text>
      <qti-gap-text identifier="choice_s0mm3rxx" match-max="1">summer</qti-gap-text>
      <p>Now is the <qti-gap identifier="gap_a1b2c3d4"/> of our discontent</p>
      <p>Made glorious <qti-gap identifier="gap_e5f6g7h8"/> by this sun of York;</p>
    </qti-gap-match-interaction>
  </qti-item-body>
</qti-assessment-item>`;

const toEl = xml => parseXML(xml).documentElement;

describe('gapMatchInteractionDescriptor', () => {
  it('is a block interaction', () => {
    expect(descriptor.placement).toBe(Placement.BLOCK);
  });

  describe('matches', () => {
    it('matches the gap match interaction element', () => {
      expect(descriptor.matches(toEl('<qti-gap-match-interaction/>'))).toBe(true);
    });

    it('does not match a match interaction', () => {
      expect(descriptor.matches(toEl('<qti-match-interaction/>'))).toBe(false);
    });
  });

  describe('resolveDescriptor', () => {
    it('resolves an item holding the interaction to gap match', () => {
      const [{ bodyXml, responseDeclarations }] = parseItem(ITEM).interactions;
      const result = resolveDescriptor(bodyXml, responseDeclarations);
      expect(result.descriptor).toBe(descriptor);
      expect(result.descriptor.type).toBe(QtiInteraction.GAP_MATCH);
      expect(result.questionType).toBe(QuestionType.GAP_MATCH);
    });

    it('shows the item read-only until the interaction has an editor', () => {
      const { interactions, itemBodyXml } = parseItem(ITEM);
      expect(isSupportedItem(interactions, itemBodyXml)).toBe(false);
    });
  });

  it('parses a full item', () => {
    const [{ bodyXml, responseDeclarations }] = parseItem(ITEM).interactions;
    const state = descriptor.parse(bodyXml, responseDeclarations);
    expect(state.prompt).toBe('<p>Identify the missing words.</p>');
    expect(getGaps(state.passage)).toEqual([
      { id: 'gap_a1b2c3d4', answerId: 'choice_w1n7erxx', answer: 'winter' },
      { id: 'gap_e5f6g7h8', answerId: 'choice_s9r1ngxx', answer: 'spring' },
    ]);
    expect(state.distractors).toEqual([{ id: 'choice_s0mm3rxx', content: 'summer' }]);
  });

  it('buildXML() writes its own declaration schema', () => {
    const [{ bodyXml, responseDeclarations }] = parseItem(ITEM).interactions;
    const state = descriptor.parse(bodyXml, responseDeclarations);
    const [declXml] = descriptor.buildXML(state, QuestionType.GAP_MATCH).responseDeclarations;
    expect(declXml).toContain('base-type="directedPair"');
    expect(declXml).toContain('cardinality="multiple"');
  });

  it('offers no question type option yet', () => {
    expect(descriptor.getTypeOptions(qtiEditorStrings)).toEqual([]);
  });
});
