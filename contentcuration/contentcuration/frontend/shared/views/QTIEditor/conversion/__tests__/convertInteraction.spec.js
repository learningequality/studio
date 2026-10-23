import flatMap from 'lodash/flatMap';
import { ConversionLoss, QuestionType } from '../../constants';
import { resolveDescriptor } from '../../interactions/resolveDescriptor';
import { convertInteraction } from '../index';
import { getDropdowns } from '../../interactions/inlineChoice/parse';
import { getGaps } from '../../interactions/gapMatch/parse';
import { QUESTION_TYPES, blankInteraction, descriptorFor, filledInteraction } from './questions';

/**
 * What converting each filled question (./questions.js) to each other type loses: the
 * rules every type change follows, in one table. A pair missing from it fails the test.
 */
const EXPECTED_LOSSES = {
  [QuestionType.SINGLE_SELECT]: {
    [QuestionType.MULTI_SELECT]: [],
    [QuestionType.NUMERIC]: [ConversionLoss.INCORRECT_ANSWERS_REMOVED],
    [QuestionType.TEXT_ENTRY]: [ConversionLoss.INCORRECT_ANSWERS_REMOVED],
    [QuestionType.FREE_RESPONSE]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.ORDERING]: [
      ConversionLoss.CORRECT_ANSWERS_NOT_KEPT,
      ConversionLoss.ORDER_BECOMES_ANSWER,
    ],
    [QuestionType.ASSOCIATE]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.MATCH]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.INLINE_CHOICE]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.GAP_MATCH]: [ConversionLoss.ANSWERS_REMOVED],
  },
  [QuestionType.MULTI_SELECT]: {
    [QuestionType.SINGLE_SELECT]: [ConversionLoss.CORRECT_ANSWERS_REDUCED],
    [QuestionType.NUMERIC]: [
      ConversionLoss.INCORRECT_ANSWERS_REMOVED,
      ConversionLoss.ANY_CORRECT_ANSWER_ACCEPTED,
    ],
    [QuestionType.TEXT_ENTRY]: [
      ConversionLoss.INCORRECT_ANSWERS_REMOVED,
      ConversionLoss.ANY_CORRECT_ANSWER_ACCEPTED,
    ],
    [QuestionType.FREE_RESPONSE]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.ORDERING]: [
      ConversionLoss.CORRECT_ANSWERS_NOT_KEPT,
      ConversionLoss.ORDER_BECOMES_ANSWER,
    ],
    [QuestionType.ASSOCIATE]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.MATCH]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.INLINE_CHOICE]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.GAP_MATCH]: [ConversionLoss.ANSWERS_REMOVED],
  },
  [QuestionType.NUMERIC]: {
    [QuestionType.SINGLE_SELECT]: [ConversionLoss.CORRECT_ANSWERS_REDUCED],
    [QuestionType.MULTI_SELECT]: [],
    [QuestionType.TEXT_ENTRY]: [],
    [QuestionType.FREE_RESPONSE]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.ORDERING]: [ConversionLoss.ORDER_BECOMES_ANSWER],
    [QuestionType.ASSOCIATE]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.MATCH]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.INLINE_CHOICE]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.GAP_MATCH]: [ConversionLoss.ANSWERS_REMOVED],
  },
  [QuestionType.TEXT_ENTRY]: {
    [QuestionType.SINGLE_SELECT]: [ConversionLoss.CORRECT_ANSWERS_REDUCED],
    [QuestionType.MULTI_SELECT]: [],
    // Answers that aren't numbers are kept, for validation to flag.
    [QuestionType.NUMERIC]: [],
    [QuestionType.FREE_RESPONSE]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.ORDERING]: [ConversionLoss.ORDER_BECOMES_ANSWER],
    [QuestionType.ASSOCIATE]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.MATCH]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.INLINE_CHOICE]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.GAP_MATCH]: [ConversionLoss.ANSWERS_REMOVED],
  },
  [QuestionType.FREE_RESPONSE]: {
    [QuestionType.SINGLE_SELECT]: [],
    [QuestionType.MULTI_SELECT]: [],
    [QuestionType.NUMERIC]: [],
    [QuestionType.TEXT_ENTRY]: [],
    [QuestionType.ORDERING]: [],
    [QuestionType.ASSOCIATE]: [],
    [QuestionType.MATCH]: [],
    [QuestionType.INLINE_CHOICE]: [],
    [QuestionType.GAP_MATCH]: [],
  },
  [QuestionType.ORDERING]: {
    [QuestionType.SINGLE_SELECT]: [ConversionLoss.ORDER_NOT_KEPT],
    [QuestionType.MULTI_SELECT]: [ConversionLoss.ORDER_NOT_KEPT],
    [QuestionType.NUMERIC]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.TEXT_ENTRY]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.FREE_RESPONSE]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.ASSOCIATE]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.MATCH]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.INLINE_CHOICE]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.GAP_MATCH]: [ConversionLoss.ANSWERS_REMOVED],
  },
  [QuestionType.ASSOCIATE]: {
    [QuestionType.SINGLE_SELECT]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.MULTI_SELECT]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.NUMERIC]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.TEXT_ENTRY]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.FREE_RESPONSE]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.ORDERING]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.MATCH]: [],
    [QuestionType.INLINE_CHOICE]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.GAP_MATCH]: [ConversionLoss.ANSWERS_REMOVED],
  },
  [QuestionType.MATCH]: {
    [QuestionType.SINGLE_SELECT]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.MULTI_SELECT]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.NUMERIC]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.TEXT_ENTRY]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.FREE_RESPONSE]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.ORDERING]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.ASSOCIATE]: [],
    [QuestionType.INLINE_CHOICE]: [ConversionLoss.ANSWERS_REMOVED],
    [QuestionType.GAP_MATCH]: [ConversionLoss.ANSWERS_REMOVED],
  },
  // The passage is folded into the question for every type without one.
  [QuestionType.INLINE_CHOICE]: {
    [QuestionType.SINGLE_SELECT]: [ConversionLoss.PASSAGE_ADDED_TO_QUESTION],
    [QuestionType.MULTI_SELECT]: [ConversionLoss.PASSAGE_ADDED_TO_QUESTION],
    [QuestionType.NUMERIC]: [ConversionLoss.PASSAGE_ADDED_TO_QUESTION],
    [QuestionType.TEXT_ENTRY]: [ConversionLoss.PASSAGE_ADDED_TO_QUESTION],
    [QuestionType.FREE_RESPONSE]: [ConversionLoss.PASSAGE_ADDED_TO_QUESTION],
    [QuestionType.ORDERING]: [ConversionLoss.PASSAGE_ADDED_TO_QUESTION],
    [QuestionType.ASSOCIATE]: [ConversionLoss.PASSAGE_ADDED_TO_QUESTION],
    [QuestionType.MATCH]: [ConversionLoss.PASSAGE_ADDED_TO_QUESTION],
    // Each dropdown's wrong options join the shared pool, which is what it amounts to.
    [QuestionType.GAP_MATCH]: [],
  },
  [QuestionType.GAP_MATCH]: {
    [QuestionType.SINGLE_SELECT]: [ConversionLoss.PASSAGE_ADDED_TO_QUESTION],
    [QuestionType.MULTI_SELECT]: [ConversionLoss.PASSAGE_ADDED_TO_QUESTION],
    [QuestionType.NUMERIC]: [ConversionLoss.PASSAGE_ADDED_TO_QUESTION],
    [QuestionType.TEXT_ENTRY]: [ConversionLoss.PASSAGE_ADDED_TO_QUESTION],
    [QuestionType.FREE_RESPONSE]: [ConversionLoss.PASSAGE_ADDED_TO_QUESTION],
    [QuestionType.ORDERING]: [ConversionLoss.PASSAGE_ADDED_TO_QUESTION],
    [QuestionType.ASSOCIATE]: [ConversionLoss.PASSAGE_ADDED_TO_QUESTION],
    [QuestionType.MATCH]: [ConversionLoss.PASSAGE_ADDED_TO_QUESTION],
    // An answer in italics, which a dropdown option can't hold.
    [QuestionType.INLINE_CHOICE]: [ConversionLoss.FORMATTING_REMOVED],
  },
};

const PAIRS = flatMap(QUESTION_TYPES, fromType =>
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
      // A passage folded into the question comes after it.
      expect(reopen(interaction, toType).prompt.startsWith(prompt)).toBe(true);
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
    const { interaction } = convert(
      filledInteraction(QuestionType.MULTI_SELECT),
      QuestionType.MULTI_SELECT,
      QuestionType.TEXT_ENTRY,
    );
    expect(answersOf(interaction, QuestionType.TEXT_ENTRY)).toEqual(['Mars', 'Venus']);
  });

  it('keeps every choice, but only the first correct one marked, for single choice', () => {
    const { interaction } = convert(
      filledInteraction(QuestionType.MULTI_SELECT),
      QuestionType.MULTI_SELECT,
      QuestionType.SINGLE_SELECT,
    );
    const { choices } = reopen(interaction, QuestionType.SINGLE_SELECT);
    expect(choices.map(({ content, correct }) => [content, correct])).toEqual([
      ['<p>Mars</p>', true],
      ['<p>Pluto</p>', false],
      ['<p>Venus</p>', false],
    ]);
  });

  it('keeps answers that are not numbers when switching to numeric', () => {
    const { interaction } = convert(
      filledInteraction(QuestionType.TEXT_ENTRY),
      QuestionType.TEXT_ENTRY,
      QuestionType.NUMERIC,
    );
    expect(answersOf(interaction, QuestionType.NUMERIC)).toEqual(['Paris', 'City of Light']);
  });

  it('gives numeric answers to another type as the exercise language shows them', () => {
    const numeric = descriptorFor(QuestionType.NUMERIC).buildXML(
      {
        prompt: '<p>Q</p>',
        answers: [{ id: 'answer_1', value: '1.5', caseSensitive: false }],
        expectedLength: 50,
      },
      QuestionType.NUMERIC,
    );
    const { interaction } = convertInteraction({
      interaction: numeric,
      fromType: QuestionType.NUMERIC,
      toType: QuestionType.TEXT_ENTRY,
      language: 'de',
    });
    expect(answersOf(interaction, QuestionType.TEXT_ENTRY)).toEqual(['1,5']);
  });

  it('resets case sensitivity after a trip through numeric', () => {
    const toNumeric = convert(
      filledInteraction(QuestionType.TEXT_ENTRY),
      QuestionType.TEXT_ENTRY,
      QuestionType.NUMERIC,
    ).interaction;
    const back = convert(toNumeric, QuestionType.NUMERIC, QuestionType.TEXT_ENTRY).interaction;
    expect(reopen(back, QuestionType.TEXT_ENTRY).answers.map(a => a.caseSensitive)).toEqual([
      false,
      false,
    ]);
  });

  it('keeps the shuffle setting between single and multi select', () => {
    const { interaction } = convert(
      filledInteraction(QuestionType.SINGLE_SELECT),
      QuestionType.SINGLE_SELECT,
      QuestionType.MULTI_SELECT,
    );
    expect(reopen(interaction, QuestionType.MULTI_SELECT).shuffle).toBe(true);
  });

  it('keeps fixed choices and the layout between single and multi select', () => {
    const choices = descriptorFor(QuestionType.MULTI_SELECT);
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
      QuestionType.MULTI_SELECT,
    );
    const converted = convert(interaction, QuestionType.MULTI_SELECT, QuestionType.SINGLE_SELECT);
    expect(converted.losses).toEqual([]);

    const state = reopen(converted.interaction, QuestionType.SINGLE_SELECT);
    expect(state.choices.map(({ fixed }) => fixed)).toEqual([false, true]);
    expect(state.orientation).toBe('horizontal');
    expect(state.shuffle).toBe(true);
  });

  it.each([
    [QuestionType.NUMERIC, QuestionType.TEXT_ENTRY],
    [QuestionType.TEXT_ENTRY, QuestionType.NUMERIC],
    [QuestionType.FREE_RESPONSE, QuestionType.TEXT_ENTRY],
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
    const { interaction } = convert(
      filledInteraction(QuestionType.MULTI_SELECT),
      QuestionType.MULTI_SELECT,
      QuestionType.ORDERING,
    );
    expect(reopen(interaction, QuestionType.ORDERING).shuffle).toBe(true);
    expect(answersOf(interaction, QuestionType.ORDERING)).toEqual([
      '<p>Mars</p>',
      '<p>Pluto</p>',
      '<p>Venus</p>',
    ]);
  });

  it('turns accepted answers into choices, all marked correct', () => {
    const { interaction } = convert(
      filledInteraction(QuestionType.TEXT_ENTRY),
      QuestionType.TEXT_ENTRY,
      QuestionType.MULTI_SELECT,
    );
    const { choices } = reopen(interaction, QuestionType.MULTI_SELECT);
    expect(choices.map(({ content, correct }) => [content, correct])).toEqual([
      ['<p>Paris</p>', true],
      ['<p>City of Light</p>', true],
    ]);
  });

  it('removes the answers a free response would not save', () => {
    const { interaction } = convert(
      filledInteraction(QuestionType.TEXT_ENTRY),
      QuestionType.TEXT_ENTRY,
      QuestionType.FREE_RESPONSE,
    );
    const back = convert(
      interaction,
      QuestionType.FREE_RESPONSE,
      QuestionType.TEXT_ENTRY,
    ).interaction;
    expect(answersOf(back, QuestionType.TEXT_ENTRY)).toEqual(['']);
  });

  it('turns each associate pair into a match row, and keeps the distractors', () => {
    const { interaction } = convert(
      filledInteraction(QuestionType.ASSOCIATE),
      QuestionType.ASSOCIATE,
      QuestionType.MATCH,
    );
    const { rows, distractors } = reopen(interaction, QuestionType.MATCH);
    expect(rows.map(({ content, matches }) => [content, matches.map(m => m.content)])).toEqual([
      ['<p>Antonio</p>', ['<p>Prospero</p>']],
      ['<p>Capulet</p>', ['<p>Montague</p>']],
    ]);
    expect(distractors.map(({ content }) => content)).toEqual(['<p>Lysander</p>']);
  });

  it('turns each match into an associate pair, a row with two matches giving two', () => {
    const { interaction } = convert(
      filledInteraction(QuestionType.MATCH),
      QuestionType.MATCH,
      QuestionType.ASSOCIATE,
    );
    const { pairs, distractors } = reopen(interaction, QuestionType.ASSOCIATE);
    expect(pairs.map(pair => pair.map(({ content }) => content))).toEqual([
      ['<p>Dog</p>', '<p>Mammal</p>'],
      ['<p>Bat</p>', '<p>Mammal</p>'],
      ['<p>Bat</p>', '<p>Flyer</p>'],
    ]);
    expect(distractors.map(({ content }) => content)).toEqual(['<p>Reptile</p>']);
  });

  it('gives back the match question it started from after a round trip through associate', () => {
    const toAssociate = convert(
      filledInteraction(QuestionType.MATCH),
      QuestionType.MATCH,
      QuestionType.ASSOCIATE,
    ).interaction;
    const back = convert(toAssociate, QuestionType.ASSOCIATE, QuestionType.MATCH);
    expect(back.losses).toEqual([]);
    const summary = interaction =>
      reopen(interaction, QuestionType.MATCH).rows.map(({ content, matches }) => [
        content,
        matches.map(m => m.content),
      ]);
    expect(summary(back.interaction)).toEqual(summary(filledInteraction(QuestionType.MATCH)));
    expect(
      descriptorFor(QuestionType.MATCH).validate(reopen(back.interaction, QuestionType.MATCH)),
    ).toEqual(
      descriptorFor(QuestionType.MATCH).validate(
        reopen(filledInteraction(QuestionType.MATCH), QuestionType.MATCH),
      ),
    );
  });

  const dropdownsOf = interaction =>
    getDropdowns(reopen(interaction, QuestionType.INLINE_CHOICE).passage).map(
      ({ options, correctId }) => ({
        options: options.map(({ text }) => text),
        correct: options.find(({ id }) => id === correctId)?.text ?? null,
      }),
    );

  it('turns each dropdown into a gap holding its answer, its other options the pool', () => {
    const { interaction } = convert(
      filledInteraction(QuestionType.INLINE_CHOICE),
      QuestionType.INLINE_CHOICE,
      QuestionType.GAP_MATCH,
    );
    const { passage, distractors } = reopen(interaction, QuestionType.GAP_MATCH);
    expect(getGaps(passage).map(({ answer }) => answer)).toEqual(['Moon', 'blue']);
    expect(distractors.map(({ content }) => content)).toEqual(['Sun', 'green']);
  });

  it('turns each gap into a dropdown offering the whole pool, its answer correct', () => {
    const { interaction } = convert(
      filledInteraction(QuestionType.GAP_MATCH),
      QuestionType.GAP_MATCH,
      QuestionType.INLINE_CHOICE,
    );
    expect(dropdownsOf(interaction)).toEqual([
      { options: ['winter', 'discontent', 'summer'], correct: 'winter' },
      { options: ['discontent', 'winter', 'summer'], correct: 'discontent' },
    ]);
    expect(reopen(interaction, QuestionType.INLINE_CHOICE).shuffle).toBe(true);
  });

  it('gives back the gap match question it started from after a round trip through inline choice', () => {
    const plain = descriptorFor(QuestionType.GAP_MATCH).buildXML(
      {
        prompt: '<p>Complete the line.</p>',
        passage:
          '<p>Now is the <qti-gap identifier="gap_season">winter</qti-gap> of our ' +
          '<qti-gap identifier="gap_mood">discontent</qti-gap>.</p>',
        distractors: [{ id: 'choice_summer', content: 'summer' }],
      },
      QuestionType.GAP_MATCH,
    );
    const toInlineChoice = convert(
      plain,
      QuestionType.GAP_MATCH,
      QuestionType.INLINE_CHOICE,
    ).interaction;
    const back = convert(toInlineChoice, QuestionType.INLINE_CHOICE, QuestionType.GAP_MATCH);
    expect(back.losses).toEqual([]);
    const summary = interaction => {
      const { passage, distractors } = reopen(interaction, QuestionType.GAP_MATCH);
      return {
        answers: getGaps(passage).map(({ answer }) => answer),
        distractors: distractors.map(({ content }) => content),
      };
    };
    expect(summary(back.interaction)).toEqual(summary(plain));
  });

  it('folds the gap match passage into the question, each gap shown as a blank', () => {
    const { interaction } = convert(
      filledInteraction(QuestionType.GAP_MATCH),
      QuestionType.GAP_MATCH,
      QuestionType.MULTI_SELECT,
    );
    expect(reopen(interaction, QuestionType.MULTI_SELECT).prompt).toBe(
      '<p>Complete the line.</p><p>Now is the _____ of our _____.</p>',
    );
  });

  it('folds the inline choice passage into the question, each dropdown shown as a blank', () => {
    const { interaction } = convert(
      filledInteraction(QuestionType.INLINE_CHOICE),
      QuestionType.INLINE_CHOICE,
      QuestionType.SINGLE_SELECT,
    );
    expect(reopen(interaction, QuestionType.SINGLE_SELECT).prompt).toBe(
      '<p>Fill in the blanks.</p><p>The _____ orbits the Earth, under a _____ sky.</p>',
    );
  });
});
