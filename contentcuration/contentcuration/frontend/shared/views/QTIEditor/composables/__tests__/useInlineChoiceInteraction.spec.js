import { nextTick, ref } from 'vue';
import { useInlineChoiceInteraction } from '../useInlineChoiceInteraction';
import { inlineChoiceInteractionDescriptor } from '../../interactions/inlineChoice/Descriptor';
import { QuestionType, ValidationError } from '../../constants';
import { chip } from '../../interactions/inlineChoice/__tests__/renderPassage';

const PASSAGE = `<p>The ${chip('r1', [
  ['a', 'Moon'],
  ['b', 'Sun'],
])} rises</p>`;

function setup(state = { prompt: '', passage: PASSAGE, shuffle: false }) {
  const questionType = ref(QuestionType.INLINE_CHOICE);
  const block = inlineChoiceInteractionDescriptor.buildXML(state, QuestionType.INLINE_CHOICE);
  return useInlineChoiceInteraction(block, questionType);
}

describe('useInlineChoiceInteraction', () => {
  it('reads the dropdowns out of the passage', () => {
    const { dropdowns } = setup();
    expect(dropdowns.value).toEqual([
      {
        responseIdentifier: 'r1',
        options: [
          { id: 'a', text: 'Moon' },
          { id: 'b', text: 'Sun' },
        ],
        correctId: null,
      },
    ]);
  });

  it('sets the question', () => {
    const { state, setPrompt } = setup();
    setPrompt('<p>Fill in the blanks</p>');
    expect(state.value.prompt).toBe('<p>Fill in the blanks</p>');
  });

  it('sets the passage, and the dropdowns follow it', () => {
    const { dropdowns, setPassage } = setup();
    setPassage(`<p>${chip('r2', [['c', 'Earth']], 'c')}</p>`);
    expect(dropdowns.value.map(d => d.responseIdentifier)).toEqual(['r2']);
  });

  it('writes Shuffle onto every dropdown in the saved XML', () => {
    const { bodyXml, setShuffle } = setup({
      prompt: '',
      passage: `<p>${chip('r1', [['a', 'x']], 'a')} ${chip('r2', [['b', 'y']], 'b')}</p>`,
      shuffle: false,
    });
    setShuffle(true);
    const shuffles = [...bodyXml.value.matchAll(/shuffle="(\w+)"/g)].map(m => m[1]);
    expect(shuffles).toEqual(['true', 'true']);
  });

  it('reads Shuffle back from a saved item', () => {
    const { state } = setup({ prompt: '', passage: PASSAGE, shuffle: true });
    expect(state.value.shuffle).toBe(true);
  });

  it('reports a passage with no dropdown', async () => {
    const { errors, setPassage } = setup();
    setPassage('<p>No dropdowns here</p>');
    await nextTick();
    expect(errors.value).toEqual([{ code: ValidationError.NO_INTERACTION }]);
  });
});
