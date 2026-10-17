import { AnswerKey, ContentLevel, QuestionType } from '../../../constants';
import {
  exportTextEntryContent,
  getTextEntryConversionFormat,
  importTextEntryContent,
} from '../convert';
import { DEFAULT_EXPECTED_LENGTH } from '../parse';

const { NUMERIC, TEXT_ENTRY, FREE_RESPONSE } = QuestionType;

const state = {
  prompt: '<p>Q</p>',
  answers: [{ id: 'answer_a', value: 'Paris', caseSensitive: true }],
  expectedLength: 80,
};

describe('text entry conversion', () => {
  it.each([NUMERIC, TEXT_ENTRY])('takes plain accepted answers for %s', questionType => {
    expect(getTextEntryConversionFormat(questionType)).toEqual({
      answers: { key: AnswerKey.ACCEPTED, level: ContentLevel.PLAIN },
    });
  });

  it('takes no answers for a free response', () => {
    expect(getTextEntryConversionFormat(FREE_RESPONSE)).toEqual({});
  });

  it('exports each answer as accepted, with its case sensitivity, and the expected length', () => {
    expect(exportTextEntryContent(state, TEXT_ENTRY)).toEqual({
      prompt: '<p>Q</p>',
      answers: {
        key: AnswerKey.ACCEPTED,
        level: ContentLevel.PLAIN,
        items: [{ content: 'Paris', correct: true, caseSensitive: true }],
        expectedLength: 80,
      },
    });
  });

  it('exports no answers from a free response, which saves none, but its expected length', () => {
    expect(exportTextEntryContent(state, FREE_RESPONSE).answers).toEqual({
      key: AnswerKey.ACCEPTED,
      level: ContentLevel.PLAIN,
      items: [],
      expectedLength: 80,
    });
  });

  it('imports the expected length that came with the answers', () => {
    const content = { prompt: '', answers: { items: [], expectedLength: 10 } };
    expect(importTextEntryContent(content, TEXT_ENTRY).expectedLength).toBe(10);
  });

  it('imports each answer as a new one, with the default expected length otherwise', () => {
    const content = {
      prompt: '<p>Q</p>',
      answers: { items: [{ content: 'Paris', correct: true, caseSensitive: true }] },
    };
    expect(importTextEntryContent(content, TEXT_ENTRY)).toEqual({
      prompt: '<p>Q</p>',
      answers: [{ id: expect.stringMatching(/^answer_/), value: 'Paris', caseSensitive: true }],
      expectedLength: DEFAULT_EXPECTED_LENGTH,
    });
  });

  it('makes no numeric answer case-sensitive', () => {
    const content = { prompt: '', answers: { items: [{ content: '1', caseSensitive: true }] } };
    expect(importTextEntryContent(content, NUMERIC).answers[0].caseSensitive).toBe(false);
  });

  it('starts with one blank answer when there are none', () => {
    expect(importTextEntryContent({ prompt: '' }, TEXT_ENTRY).answers).toEqual([
      { id: expect.stringMatching(/^answer_/), value: '', caseSensitive: false },
    ]);
  });
});
