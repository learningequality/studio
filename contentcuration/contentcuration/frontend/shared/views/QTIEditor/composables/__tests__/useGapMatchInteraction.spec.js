import { nextTick, ref } from 'vue';
import { useGapMatchInteraction } from '../useGapMatchInteraction';
import { gapMatchInteractionDescriptor } from '../../interactions/gapMatch/Descriptor';
import { QuestionType, ValidationError } from '../../constants';
import { gap } from '../../interactions/gapMatch/__tests__/renderPassage';

const PASSAGE = `<p>Snow falls in ${gap('gap_a', 'winter')}.</p>`;

function setup(state = { prompt: '', passage: PASSAGE, distractors: [] }) {
  const questionType = ref(QuestionType.GAP_MATCH);
  const block = gapMatchInteractionDescriptor.buildXML(state, QuestionType.GAP_MATCH);
  return useGapMatchInteraction(block, questionType);
}

describe('useGapMatchInteraction', () => {
  it('reads the gaps out of the passage', () => {
    const { gaps } = setup();
    expect(gaps.value).toEqual([{ id: 'gap_a', answerId: expect.any(String), answer: 'winter' }]);
  });

  it('sets the question', () => {
    const { state, setPrompt } = setup();
    setPrompt('<p>Fill in the seasons</p>');
    expect(state.value.prompt).toBe('<p>Fill in the seasons</p>');
  });

  it('saves a cleared question as no question', () => {
    const { state, bodyXml, setPrompt } = setup({
      prompt: '<p>Fill in the seasons</p>',
      passage: PASSAGE,
      distractors: [],
    });
    setPrompt('<p></p>');
    expect(state.value.prompt).toBe('');
    expect(bodyXml.value).not.toContain('qti-prompt');
  });

  it('sets the passage, and the gaps follow it', () => {
    const { gaps, setPassage } = setup();
    setPassage(`<p>${gap('gap_b', 'summer')}</p>`);
    expect(gaps.value.map(g => g.id)).toEqual(['gap_b']);
  });

  it('adds, edits and removes distractors', () => {
    const { state, addDistractor, setDistractorContent, removeDistractor } = setup();
    addDistractor('spring');
    addDistractor();
    setDistractorContent(1, 'autumn');
    removeDistractor(0);
    expect(state.value.distractors).toEqual([{ id: expect.any(String), content: 'autumn' }]);
  });

  it('saves a distractor as a gap text that no gap takes', () => {
    const { bodyXml, addDistractor } = setup();
    addDistractor('spring');
    expect(bodyXml.value).toMatch(/<qti-gap-text identifier="[^"]+" match-max="1">spring</);
  });

  it('reports a gap with no answer', async () => {
    const { errors, setPassage } = setup();
    setPassage(`<p>${gap('gap_b')}</p>`);
    await nextTick();
    expect(errors.value).toEqual([{ code: ValidationError.EMPTY_ANSWER_CONTENT, id: 'gap_b' }]);
  });
});
