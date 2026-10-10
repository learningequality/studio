import { ConversionLoss, QuestionType } from '../../constants';
import { resolveDescriptor } from '../../interactions/resolveDescriptor';
import { convertInteraction } from '../index';
import { QUESTION_TYPES, blankInteraction, descriptorFor, filledInteraction } from './questions';

const {
  SINGLE_SELECT,
  MULTI_SELECT,
  NUMERIC,
  TEXT_ENTRY,
  FREE_RESPONSE,
  ORDERING,
  ASSOCIATE,
  MATCH,
} = QuestionType;
const {
  ANSWERS_REMOVED,
  INCORRECT_ANSWERS_REMOVED,
  CORRECT_ANSWERS_REDUCED,
  CORRECT_ANSWERS_NOT_KEPT,
  ORDER_BECOMES_ANSWER,
  ORDER_NOT_KEPT,
} = ConversionLoss;

/**
 * What converting each filled question (./questions.js) to each other type loses: the
 * rules every type change follows, in one table. A pair missing from it fails the test.
 */
const EXPECTED_LOSSES = {
  [SINGLE_SELECT]: {
    [MULTI_SELECT]: [],
    [NUMERIC]: [INCORRECT_ANSWERS_REMOVED],
    [TEXT_ENTRY]: [INCORRECT_ANSWERS_REMOVED],
    [FREE_RESPONSE]: [ANSWERS_REMOVED],
    [ORDERING]: [CORRECT_ANSWERS_NOT_KEPT, ORDER_BECOMES_ANSWER],
    [ASSOCIATE]: [ANSWERS_REMOVED],
    [MATCH]: [ANSWERS_REMOVED],
  },
  [MULTI_SELECT]: {
    [SINGLE_SELECT]: [CORRECT_ANSWERS_REDUCED],
    [NUMERIC]: [INCORRECT_ANSWERS_REMOVED],
    [TEXT_ENTRY]: [INCORRECT_ANSWERS_REMOVED],
    [FREE_RESPONSE]: [ANSWERS_REMOVED],
    [ORDERING]: [CORRECT_ANSWERS_NOT_KEPT, ORDER_BECOMES_ANSWER],
    [ASSOCIATE]: [ANSWERS_REMOVED],
    [MATCH]: [ANSWERS_REMOVED],
  },
  [NUMERIC]: {
    [SINGLE_SELECT]: [CORRECT_ANSWERS_REDUCED],
    [MULTI_SELECT]: [],
    [TEXT_ENTRY]: [],
    [FREE_RESPONSE]: [ANSWERS_REMOVED],
    [ORDERING]: [ORDER_BECOMES_ANSWER],
    [ASSOCIATE]: [ANSWERS_REMOVED],
    [MATCH]: [ANSWERS_REMOVED],
  },
  [TEXT_ENTRY]: {
    [SINGLE_SELECT]: [CORRECT_ANSWERS_REDUCED],
    [MULTI_SELECT]: [],
    // Answers that aren't numbers are kept, for validation to flag.
    [NUMERIC]: [],
    [FREE_RESPONSE]: [ANSWERS_REMOVED],
    [ORDERING]: [ORDER_BECOMES_ANSWER],
    [ASSOCIATE]: [ANSWERS_REMOVED],
    [MATCH]: [ANSWERS_REMOVED],
  },
  [FREE_RESPONSE]: {
    [SINGLE_SELECT]: [],
    [MULTI_SELECT]: [],
    [NUMERIC]: [],
    [TEXT_ENTRY]: [],
    [ORDERING]: [],
    [ASSOCIATE]: [],
    [MATCH]: [],
  },
  [ORDERING]: {
    [SINGLE_SELECT]: [ORDER_NOT_KEPT],
    [MULTI_SELECT]: [ORDER_NOT_KEPT],
    [NUMERIC]: [ANSWERS_REMOVED],
    [TEXT_ENTRY]: [ANSWERS_REMOVED],
    [FREE_RESPONSE]: [ANSWERS_REMOVED],
    [ASSOCIATE]: [ANSWERS_REMOVED],
    [MATCH]: [ANSWERS_REMOVED],
  },
  [ASSOCIATE]: {
    [SINGLE_SELECT]: [ANSWERS_REMOVED],
    [MULTI_SELECT]: [ANSWERS_REMOVED],
    [NUMERIC]: [ANSWERS_REMOVED],
    [TEXT_ENTRY]: [ANSWERS_REMOVED],
    [FREE_RESPONSE]: [ANSWERS_REMOVED],
    [ORDERING]: [ANSWERS_REMOVED],
    [MATCH]: [],
  },
  [MATCH]: {
    [SINGLE_SELECT]: [ANSWERS_REMOVED],
    [MULTI_SELECT]: [ANSWERS_REMOVED],
    [NUMERIC]: [ANSWERS_REMOVED],
    [TEXT_ENTRY]: [ANSWERS_REMOVED],
    [FREE_RESPONSE]: [ANSWERS_REMOVED],
    [ORDERING]: [ANSWERS_REMOVED],
    [ASSOCIATE]: [],
  },
};

const PAIRS = QUESTION_TYPES.flatMap(fromType =>
  QUESTION_TYPES.filter(toType => toType !== fromType).map(toType => [fromType, toType]),
);

function convert(interaction, fromType, toType) {
  return convertInteraction({ interaction, fromType, toType });
}

/** The state the target type's editor would open the converted question with. */
function reopen({ bodyXml, responseDeclarations }, toType) {
  return descriptorFor(toType).parse(bodyXml, responseDeclarations);
}

describe('convertInteraction', () => {
  describe.each(PAIRS)('from %s to %s', (fromType, toType) => {
    it('loses what the rules say, and nothing else', () => {
      const { losses } = convert(filledInteraction(fromType), fromType, toType);
      expect(losses).toEqual(EXPECTED_LOSSES[fromType][toType]);
    });

    it('writes a question that reopens as the new type, with the question kept', () => {
      const { interaction } = convert(filledInteraction(fromType), fromType, toType);
      const { questionType, error } = resolveDescriptor(
        interaction.bodyXml,
        interaction.responseDeclarations,
      );
      expect(error).toBeNull();
      expect(questionType).toBe(toType);
      const { prompt } = reopen(filledInteraction(fromType), fromType);
      expect(reopen(interaction, toType).prompt).toBe(prompt);
    });

    it('loses nothing from a question nobody has filled in', () => {
      expect(convert(blankInteraction(fromType), fromType, toType).losses).toEqual([]);
    });
  });

  const answersOf = (interaction, toType) => {
    const state = reopen(interaction, toType);
    return (state.choices ?? state.answers ?? state.items).map(
      answer => answer.value ?? answer.content,
    );
  };

  it('keeps the correct choices, and only those, as accepted answers', () => {
    const { interaction } = convert(filledInteraction(MULTI_SELECT), MULTI_SELECT, TEXT_ENTRY);
    expect(answersOf(interaction, TEXT_ENTRY)).toEqual(['Mars', 'Venus']);
  });

  it('keeps every choice, but only the first correct one marked, for single choice', () => {
    const { interaction } = convert(filledInteraction(MULTI_SELECT), MULTI_SELECT, SINGLE_SELECT);
    const { choices } = reopen(interaction, SINGLE_SELECT);
    expect(choices.map(({ content, correct }) => [content, correct])).toEqual([
      ['<p>Mars</p>', true],
      ['<p>Pluto</p>', false],
      ['<p>Venus</p>', false],
    ]);
  });

  it('keeps answers that are not numbers when switching to numeric', () => {
    const { interaction } = convert(filledInteraction(TEXT_ENTRY), TEXT_ENTRY, NUMERIC);
    expect(answersOf(interaction, NUMERIC)).toEqual(['Paris', 'City of Light']);
  });

  it('keeps case sensitivity between text entry questions only', () => {
    const toNumeric = convert(filledInteraction(TEXT_ENTRY), TEXT_ENTRY, NUMERIC).interaction;
    const back = convert(toNumeric, NUMERIC, TEXT_ENTRY).interaction;
    expect(reopen(back, TEXT_ENTRY).answers.map(a => a.caseSensitive)).toEqual([false, false]);
  });

  it('keeps the shuffle setting between single and multi select', () => {
    const { interaction } = convert(filledInteraction(SINGLE_SELECT), SINGLE_SELECT, MULTI_SELECT);
    expect(reopen(interaction, MULTI_SELECT).shuffle).toBe(true);
  });

  it('keeps fixed choices and the layout between single and multi select', () => {
    const choices = descriptorFor(MULTI_SELECT);
    const interaction = choices.buildXML(
      {
        prompt: '<p>Which apply?</p>',
        choices: [
          { id: 'choice_a', content: '<p>A</p>', correct: true },
          { id: 'choice_none', content: '<p>None of the above</p>', correct: false, fixed: true },
        ],
        shuffle: true,
        showAnswerCount: true,
        orientation: 'horizontal',
      },
      MULTI_SELECT,
    );
    const converted = convert(interaction, MULTI_SELECT, SINGLE_SELECT);
    expect(converted.losses).toEqual([]);

    const state = reopen(converted.interaction, SINGLE_SELECT);
    expect(state.choices.map(({ fixed }) => fixed)).toEqual([false, true]);
    expect(state.orientation).toBe('horizontal');
    expect(state.shuffle).toBe(true);
  });

  it.each([
    [NUMERIC, TEXT_ENTRY],
    [TEXT_ENTRY, NUMERIC],
    [FREE_RESPONSE, TEXT_ENTRY],
  ])('keeps the expected length from %s to %s', (fromType, toType) => {
    const textEntry = descriptorFor(fromType);
    const interaction = textEntry.buildXML(
      { prompt: '<p>Q</p>', answers: [{ id: 'answer_1', value: '42' }], expectedLength: 10 },
      fromType,
    );
    const converted = convert(interaction, fromType, toType).interaction;
    expect(reopen(converted, toType).expectedLength).toBe(10);
  });

  it('keeps ordering shuffled, whatever the question it came from', () => {
    const { interaction } = convert(filledInteraction(MULTI_SELECT), MULTI_SELECT, ORDERING);
    expect(reopen(interaction, ORDERING).shuffle).toBe(true);
    expect(answersOf(interaction, ORDERING)).toEqual([
      '<p>Mars</p>',
      '<p>Pluto</p>',
      '<p>Venus</p>',
    ]);
  });

  it('turns accepted answers into choices, all marked correct', () => {
    const { interaction } = convert(filledInteraction(TEXT_ENTRY), TEXT_ENTRY, MULTI_SELECT);
    const { choices } = reopen(interaction, MULTI_SELECT);
    expect(choices.map(({ content, correct }) => [content, correct])).toEqual([
      ['<p>Paris</p>', true],
      ['<p>City of Light</p>', true],
    ]);
  });

  it('removes the answers a free response would not save', () => {
    const { interaction } = convert(filledInteraction(TEXT_ENTRY), TEXT_ENTRY, FREE_RESPONSE);
    const back = convert(interaction, FREE_RESPONSE, TEXT_ENTRY).interaction;
    expect(answersOf(back, TEXT_ENTRY)).toEqual(['']);
  });

  it('turns each associate pair into a match row, and keeps the distractors', () => {
    const { interaction } = convert(filledInteraction(ASSOCIATE), ASSOCIATE, MATCH);
    const { rows, distractors } = reopen(interaction, MATCH);
    expect(rows.map(({ content, matches }) => [content, matches.map(m => m.content)])).toEqual([
      ['<p>Antonio</p>', ['<p>Prospero</p>']],
      ['<p>Capulet</p>', ['<p>Montague</p>']],
    ]);
    expect(distractors.map(({ content }) => content)).toEqual(['<p>Lysander</p>']);
  });

  it('turns each match into an associate pair, a row with two matches giving two', () => {
    const { interaction } = convert(filledInteraction(MATCH), MATCH, ASSOCIATE);
    const { pairs, distractors } = reopen(interaction, ASSOCIATE);
    expect(pairs.map(pair => pair.map(({ content }) => content))).toEqual([
      ['<p>Dog</p>', '<p>Mammal</p>'],
      ['<p>Bat</p>', '<p>Mammal</p>'],
      ['<p>Bat</p>', '<p>Flyer</p>'],
    ]);
    expect(distractors.map(({ content }) => content)).toEqual(['<p>Reptile</p>']);
  });

  it('gives back the match question it started from after a round trip through associate', () => {
    const toAssociate = convert(filledInteraction(MATCH), MATCH, ASSOCIATE).interaction;
    const back = convert(toAssociate, ASSOCIATE, MATCH);
    expect(back.losses).toEqual([]);
    const summary = interaction =>
      reopen(interaction, MATCH).rows.map(({ content, matches }) => [
        content,
        matches.map(m => m.content),
      ]);
    expect(summary(back.interaction)).toEqual(summary(filledInteraction(MATCH)));
    expect(descriptorFor(MATCH).validate(reopen(back.interaction, MATCH))).toEqual(
      descriptorFor(MATCH).validate(reopen(filledInteraction(MATCH), MATCH)),
    );
  });
});
