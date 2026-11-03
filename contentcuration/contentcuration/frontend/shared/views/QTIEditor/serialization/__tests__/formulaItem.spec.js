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

describe('an item converted from legacy markdown with formulas', () => {
  const inlineMath = (latex, mathml) =>
    '<math xmlns="http://www.w3.org/1998/Math/MathML" display="inline"><semantics>' +
    `<mrow>${mathml}</mrow><annotation encoding="application/x-tex">${latex}</annotation>` +
    '</semantics></math>';
  const blockMath = (latex, mathml) =>
    inlineMath(latex, mathml).replace('display="inline"', 'display="block"');
  const RAW_DATA =
    '<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" ' +
    'identifier="item_1" title="Question" xml:lang="en">' +
    '<qti-response-declaration identifier="RESPONSE" cardinality="single" ' +
    'base-type="identifier"><qti-correct-response><qti-value>choice_0</qti-value>' +
    '</qti-correct-response></qti-response-declaration>' +
    '<qti-item-body><qti-choice-interaction response-identifier="RESPONSE" ' +
    'max-choices="1"><qti-prompt>' +
    `<p>What is ${inlineMath('x^2 &lt; 1', '<mi>x</mi>')} when x is 2?</p>` +
    blockMath('\\frac{a}{b}', '<mi>a</mi>') +
    '</qti-prompt><qti-simple-choice identifier="choice_0">' +
    blockMath('\\frac{1}{2}', '<mn>1</mn>') +
    '</qti-simple-choice><qti-simple-choice identifier="choice_1">' +
    '<p>Other</p></qti-simple-choice></qti-choice-interaction></qti-item-body>' +
    '<qti-catalog-info><qti-catalog id="kolibri-hints"><qti-card support="ext:kolibri-hint">' +
    `<qti-html-content><p>Square it: ${inlineMath('2^2', '<mn>2</mn>')} first</p>` +
    '</qti-html-content></qti-card></qti-catalog></qti-catalog-info></qti-assessment-item>';

  let item;
  let state;

  beforeAll(() => {
    item = parseItem(RAW_DATA);
    const [interaction] = item.interactions;
    state = choiceInteractionDescriptor.parse(
      interaction.bodyXml,
      interaction.responseDeclarations,
    );
  });

  it('loads inline and block formulas in the prompt as editor formulas', () => {
    expect(load(state.prompt)).toBe(
      '<p>What is <span data-latex="x^2 < 1"></span> when x is 2?</p>' +
        '<p><span data-latex="\\frac{a}{b}"></span></p>',
    );
  });

  it('loads a formula answer as an editor formula', () => {
    expect(load(state.choices[0].content)).toBe('<p><span data-latex="\\frac{1}{2}"></span></p>');
  });

  it('loads a formula in a hint as an editor formula', () => {
    expect(load(item.hints[0].content)).toBe(
      '<p>Square it: <span data-latex="2^2"></span> first</p>',
    );
  });
});
