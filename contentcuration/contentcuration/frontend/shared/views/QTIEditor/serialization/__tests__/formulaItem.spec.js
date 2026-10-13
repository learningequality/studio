import { assembleItemXml } from '../assembleItem';
import { parseItem } from '../parseItem';
import { choiceInteractionDescriptor } from '../../interactions/choice/Descriptor';
import { orderingInteractionDescriptor } from '../../interactions/ordering/Descriptor';
import { matchInteractionDescriptor } from '../../interactions/match/Descriptor';
import { associateInteractionDescriptor } from '../../interactions/associate/Descriptor';
import { useEditor } from '../../../TipTapEditor/TipTapEditor/composables/useEditor';
import { QuestionType } from '../../constants';

const CONTENT = '<p>Solve <span data-latex="x^2"></span> for x</p>';

const INTERACTIONS = [
  {
    name: 'choice',
    descriptor: choiceInteractionDescriptor,
    questionType: QuestionType.SINGLE_SELECT,
    state: {
      prompt: CONTENT,
      choices: [
        { id: 'a', content: CONTENT, correct: true, fixed: false },
        { id: 'b', content: '<p>Other</p>', correct: false, fixed: false },
      ],
      shuffle: false,
      orientation: 'vertical',
      showAnswerCount: true,
    },
    option: state => state.choices[0].content,
  },
  {
    name: 'ordering',
    descriptor: orderingInteractionDescriptor,
    questionType: QuestionType.ORDERING,
    state: {
      prompt: CONTENT,
      items: [
        { id: 'a', content: CONTENT },
        { id: 'b', content: '<p>Other</p>' },
      ],
      orientation: 'vertical',
      shuffle: true,
    },
    option: state => state.items[0].content,
  },
  {
    name: 'match',
    descriptor: matchInteractionDescriptor,
    questionType: QuestionType.MATCH,
    state: {
      prompt: CONTENT,
      rows: [{ id: 'row_a', content: CONTENT, matches: [{ id: 'b', content: '<p>Other</p>' }] }],
      distractors: [],
    },
    option: state => state.rows[0].content,
  },
  {
    name: 'associate',
    descriptor: associateInteractionDescriptor,
    questionType: QuestionType.ASSOCIATE,
    state: {
      prompt: CONTENT,
      pairs: [
        [
          { id: 'a', content: CONTENT },
          { id: 'b', content: '<p>Other</p>' },
        ],
      ],
      distractors: [],
    },
    option: state => state.pairs[0][0].content,
  },
];

const load = html => {
  const { initializeEditor, editor } = useEditor();
  initializeEditor(html, 'edit');
  const loaded = editor.value.getHTML();
  editor.value.destroy();
  return loaded;
};

const buildItem = interaction => {
  const { bodyXml, responseDeclarations } = interaction.descriptor.buildXML(
    interaction.state,
    interaction.questionType,
  );
  return parseItem(
    assembleItemXml({
      identifier: 'item_1',
      title: 'Question',
      language: 'en',
      bodyXml,
      responseDeclarations,
      hints: [{ id: 'hint_1', content: CONTENT }],
    }),
  );
};

describe.each(INTERACTIONS)('a $name item with text after a formula', interaction => {
  let state;

  beforeAll(() => {
    const [parsed] = buildItem(interaction).interactions;
    state = interaction.descriptor.parse(parsed.bodyXml, parsed.responseDeclarations);
  });

  it.each([
    ['prompt', () => state.prompt],
    ['option', () => interaction.option(state)],
  ])('keeps the text in its %s once loaded into the editor', (_, read) => {
    expect(load(read())).toBe(CONTENT);
  });
});

it('keeps the text after a formula in a hint once loaded into the editor', () => {
  const item = buildItem(INTERACTIONS[0]);
  expect(load(item.hints[0].content)).toBe(CONTENT);
});
