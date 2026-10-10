import { Orientation, QuestionType } from '../../constants';
import { descriptors } from '../../interactions/descriptors';

/**
 * One fully filled question per question type, as its descriptor's state, for the
 * conversion tests. Each holds something in every field that can be lost, so every loss a
 * conversion can bring shows up.
 */

const choice = (content, correct = false) => ({ id: `choice_${content}`, content, correct });
const associable = (id, content) => ({ id, content });

/** A dropdown as the inline choice passage holds it, its first option correct. */
function dropdown(name, options) {
  const ids = options.map(text => `choice_${name}_${text}`);
  const optionsHTML = options
    .map((text, i) => `<qti-inline-choice identifier="${ids[i]}">${text}</qti-inline-choice>`)
    .join('');
  return (
    `<qti-inline-choice-interaction response-identifier="response_${name}" ` +
    `data-studio-correct="${ids[0]}">${optionsHTML}</qti-inline-choice-interaction>`
  );
}

const FILLED = {
  [QuestionType.SINGLE_SELECT]: {
    prompt: '<p>Which planet is closest to the Sun?</p>',
    choices: [choice('<p>Mercury</p>', true), choice('<p>Venus</p>'), choice('<p>Earth</p>')],
    showAnswerCount: true,
    shuffle: true,
    orientation: Orientation.VERTICAL,
  },
  [QuestionType.MULTI_SELECT]: {
    prompt: '<p>Which are planets?</p>',
    choices: [choice('<p>Mars</p>', true), choice('<p>Pluto</p>'), choice('<p>Venus</p>', true)],
    showAnswerCount: true,
    shuffle: false,
    orientation: Orientation.VERTICAL,
  },
  [QuestionType.NUMERIC]: {
    prompt: '<p>What is six times seven?</p>',
    answers: [
      { id: 'answer_1', value: '42', caseSensitive: false },
      { id: 'answer_2', value: '42.0', caseSensitive: false },
    ],
    expectedLength: 50,
  },
  [QuestionType.TEXT_ENTRY]: {
    prompt: '<p>What is the capital of France?</p>',
    answers: [
      { id: 'answer_1', value: 'Paris', caseSensitive: true },
      { id: 'answer_2', value: 'City of Light', caseSensitive: false },
    ],
    expectedLength: 50,
  },
  [QuestionType.FREE_RESPONSE]: {
    prompt: '<p>Describe your favourite planet.</p>',
    answers: [],
    expectedLength: 50,
  },
  [QuestionType.ORDERING]: {
    prompt: '<p>Order the planets from the Sun.</p>',
    items: [
      { id: 'order_1', content: '<p>Mercury</p>' },
      { id: 'order_2', content: '<p>Venus</p>' },
      { id: 'order_3', content: '<p>Earth</p>' },
    ],
    orientation: Orientation.VERTICAL,
    shuffle: true,
  },
  [QuestionType.ASSOCIATE]: {
    prompt: '<p>Match each character to their adversary.</p>',
    pairs: [
      [associable('choice_a', '<p>Antonio</p>'), associable('choice_b', '<p>Prospero</p>')],
      [associable('choice_c', '<p>Capulet</p>'), associable('choice_d', '<p>Montague</p>')],
    ],
    distractors: [associable('choice_e', '<p>Lysander</p>')],
  },
  [QuestionType.MATCH]: {
    prompt: '<p>Match each animal to what it is.</p>',
    rows: [
      { id: 'row_dog', content: '<p>Dog</p>', matches: [associable('choice_m', '<p>Mammal</p>')] },
      {
        id: 'row_bat',
        content: '<p>Bat</p>',
        matches: [associable('choice_m2', '<p>Mammal</p>'), associable('choice_f', '<p>Flyer</p>')],
      },
    ],
    distractors: [associable('choice_r', '<p>Reptile</p>')],
  },
  [QuestionType.INLINE_CHOICE]: {
    prompt: '<p>Fill in the blanks.</p>',
    passage: `<p>The ${dropdown('moon', ['Moon', 'Sun'])} orbits the Earth, under a ${dropdown(
      'sky',
      ['blue', 'green'],
    )} sky.</p>`,
    shuffle: true,
  },
  [QuestionType.GAP_MATCH]: {
    prompt: '<p>Complete the line.</p>',
    passage:
      '<p>Now is the <qti-gap identifier="gap_season"><em>winter</em></qti-gap> of our ' +
      '<qti-gap identifier="gap_mood">discontent</qti-gap>.</p>',
    distractors: [{ id: 'choice_summer', content: 'summer' }],
  },
};

export function descriptorFor(questionType) {
  return descriptors.find(d => d.questionTypes.includes(questionType));
}

/** The question types with a filled question here. */
export const QUESTION_TYPES = Object.keys(FILLED);

/**
 * @param {string} questionType
 * @returns {{ bodyXml: string, responseDeclarations: string[] }}
 */
export function filledInteraction(questionType) {
  return descriptorFor(questionType).buildXML(FILLED[questionType], questionType);
}

/**
 * A question as an author starts it, before filling anything in.
 *
 * @param {string} questionType
 * @returns {{ bodyXml: string, responseDeclarations: string[] }}
 */
export function blankInteraction(questionType) {
  const descriptor = descriptorFor(questionType);
  return descriptor.buildXML(descriptor.parse('', []), questionType);
}
