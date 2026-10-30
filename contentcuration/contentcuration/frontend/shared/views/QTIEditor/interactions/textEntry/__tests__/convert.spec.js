import { CorrectCriterion, ContentLevel, QuestionType } from '../../../constants';
import {
  exportTextEntryContent,
  getTextEntryConversionFormat,
  importTextEntryContent,
} from '../convert';
import { DEFAULT_EXPECTED_LENGTH } from '../parse';

const state = {
  prompt: '<p>Q</p>',
  answers: [{ id: 'answer_a', value: 'Paris', caseSensitive: true }],
  expectedLength: 80,
};

describe('text entry conversion', () => {
  it.each([
    [QuestionType.NUMERIC, {}],
    [QuestionType.TEXT_ENTRY, { caseSensitive: false }],
  ])('takes plain accepted answers for %s', (questionType, settings) => {
    expect(getTextEntryConversionFormat(questionType)).toEqual({
      answers: { correctCriterion: CorrectCriterion.ACCEPTED, contentLevel: ContentLevel.PLAIN },
      settings,
    });
  });

  it('takes no answers for a free response', () => {
    expect(getTextEntryConversionFormat(QuestionType.FREE_RESPONSE)).toEqual({});
  });

  it('exports each answer as accepted, with its case sensitivity, and the expected length', () => {
    expect(exportTextEntryContent(state, QuestionType.TEXT_ENTRY)).toEqual({
      prompt: '<p>Q</p>',
      answers: {
        correctCriterion: CorrectCriterion.ACCEPTED,
        contentLevel: ContentLevel.PLAIN,
        items: [{ content: 'Paris', correct: true, caseSensitive: true }],
        expectedLength: 80,
      },
      settings: { caseSensitive: true },
    });
  });

  it('exports no case sensitivity when case matters to no case-sensitive answer', () => {
    const noCase = {
      ...state,
      answers: [
        { id: 'answer_a', value: '1,5', caseSensitive: true },
        { id: 'answer_b', value: 'Paris', caseSensitive: false },
      ],
    };
    expect(exportTextEntryContent(noCase, QuestionType.TEXT_ENTRY).settings).toEqual({});
  });

  it.each([QuestionType.NUMERIC, QuestionType.FREE_RESPONSE])(
    'exports no settings from %s, which has none',
    questionType => {
      expect(exportTextEntryContent(state, questionType).settings).toEqual({});
    },
  );

  it('exports no answers from a free response, which saves none, but its expected length', () => {
    expect(exportTextEntryContent(state, QuestionType.FREE_RESPONSE).answers).toEqual({
      correctCriterion: CorrectCriterion.ACCEPTED,
      contentLevel: ContentLevel.PLAIN,
      items: [],
      expectedLength: 80,
    });
  });

  describe('numeric answers', () => {
    const numeric = values => ({
      prompt: '',
      answers: values.map((value, i) => ({ id: `answer_${i}`, value, caseSensitive: false })),
      expectedLength: 80,
    });
    const exported = (values, options) =>
      exportTextEntryContent(numeric(values), QuestionType.NUMERIC, options).answers.items.map(
        ({ content }) => content,
      );

    it('exports them as the exercise language shows them', () => {
      expect(exported(['1.5', '1234.5'], { language: 'de' })).toEqual(['1,5', '1234,5']);
      expect(exported(['1.5'], { language: 'en' })).toEqual(['1.5']);
    });

    it('exports them as stored when the exercise has no language', () => {
      expect(exported(['1.5', '1234.5'])).toEqual(['1.5', '1234.5']);
    });

    it('exports an answer that is not a number as it was written', () => {
      expect(exported(['abc'], { language: 'de' })).toEqual(['abc']);
    });

    const imported = (contents, questionType, options) =>
      importTextEntryContent(
        { prompt: '', answers: { items: contents.map(content => ({ content, correct: true })) } },
        questionType,
        options,
      ).answers.map(({ value }) => value);

    it('imports them read in the exercise language, as typing them in would store them', () => {
      // German groups thousands with a point.
      expect(imported(['1,5', '1.000'], QuestionType.NUMERIC, { language: 'de' })).toEqual([
        '1.5',
        '1000',
      ]);
    });

    it('imports them as xsd:double when the exercise has no language', () => {
      expect(imported(['1.5', '1,5'], QuestionType.NUMERIC)).toEqual(['1.5', '1,5']);
    });

    it('imports an answer that is not a number as it was written', () => {
      expect(imported(['abc'], QuestionType.NUMERIC, { language: 'de' })).toEqual(['abc']);
    });

    it('imports answers that store the same number once', () => {
      expect(imported(['2', '2.0', '-1.5', '+2'], QuestionType.NUMERIC)).toEqual(['2', '-1.5']);
      expect(imported(['1,5', '1,50'], QuestionType.NUMERIC, { language: 'de' })).toEqual(['1.5']);
    });

    it('imports text entry answers as written, whatever the exercise language', () => {
      expect(imported(['1.000'], QuestionType.TEXT_ENTRY, { language: 'de' })).toEqual(['1.000']);
    });
  });

  it('exports text entry answers as written, whatever the exercise language', () => {
    const decimal = { ...state, answers: [{ id: 'answer_a', value: '1.5', caseSensitive: false }] };
    const { items } = exportTextEntryContent(decimal, QuestionType.TEXT_ENTRY, {
      language: 'de',
    }).answers;
    expect(items.map(({ content }) => content)).toEqual(['1.5']);
  });

  it('imports the expected length that came with the answers', () => {
    const content = { prompt: '', answers: { items: [], expectedLength: 10 } };
    expect(importTextEntryContent(content, QuestionType.TEXT_ENTRY).expectedLength).toBe(10);
  });

  it('imports each answer as a new one, with the default expected length otherwise', () => {
    const content = {
      prompt: '<p>Q</p>',
      answers: { items: [{ content: 'Paris', correct: true, caseSensitive: true }] },
    };
    expect(importTextEntryContent(content, QuestionType.TEXT_ENTRY)).toEqual({
      prompt: '<p>Q</p>',
      answers: [{ id: expect.stringMatching(/^answer_/), value: 'Paris', caseSensitive: true }],
      expectedLength: DEFAULT_EXPECTED_LENGTH,
    });
  });

  it('makes no numeric answer case-sensitive', () => {
    const content = { prompt: '', answers: { items: [{ content: '1', caseSensitive: true }] } };
    expect(importTextEntryContent(content, QuestionType.NUMERIC).answers[0].caseSensitive).toBe(
      false,
    );
  });

  it('starts with one blank answer when there are none', () => {
    expect(importTextEntryContent({ prompt: '' }, QuestionType.TEXT_ENTRY).answers).toEqual([
      { id: expect.stringMatching(/^answer_/), value: '', caseSensitive: false },
    ]);
  });
});
