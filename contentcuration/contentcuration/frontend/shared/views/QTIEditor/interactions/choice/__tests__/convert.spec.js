import { CorrectCriterion, ContentLevel, QuestionType } from '../../../constants';
import { exportChoiceContent, getChoiceConversionFormat, importChoiceContent } from '../convert';

describe('choice conversion', () => {
  it('takes rich selected answers, at most one correct for single choice', () => {
    expect(getChoiceConversionFormat(QuestionType.SINGLE_SELECT).answers).toEqual({
      correctCriterion: CorrectCriterion.SELECTED,
      contentLevel: ContentLevel.RICH,
      single: true,
    });
    expect(getChoiceConversionFormat(QuestionType.MULTI_SELECT).answers.single).toBe(false);
  });

  it('keeps shuffle, and the answer count for multiple choice, as a new question starts', () => {
    expect(getChoiceConversionFormat(QuestionType.SINGLE_SELECT).settings).toEqual({
      shuffle: false,
    });
    expect(getChoiceConversionFormat(QuestionType.MULTI_SELECT).settings).toEqual({
      shuffle: false,
      showAnswerCount: true,
    });
  });

  const state = {
    prompt: '<p>Q</p>',
    choices: [
      { id: 'choice_a', content: '<p>A</p>', correct: true, fixed: true },
      { id: 'choice_b', content: '<p>B</p>', correct: false },
    ],
    shuffle: true,
    showAnswerCount: false,
    orientation: 'horizontal',
  };

  it('exports the question, each choice with its mark, the layout and the settings', () => {
    expect(exportChoiceContent(state, QuestionType.MULTI_SELECT)).toEqual({
      prompt: '<p>Q</p>',
      answers: {
        correctCriterion: CorrectCriterion.SELECTED,
        contentLevel: ContentLevel.RICH,
        items: [
          { content: '<p>A</p>', correct: true, fixed: true },
          { content: '<p>B</p>', correct: false, fixed: false },
        ],
        orientation: 'horizontal',
      },
      settings: { shuffle: true, showAnswerCount: false },
    });
  });

  it('exports only the settings the author changed', () => {
    const unchanged = { ...state, shuffle: false, showAnswerCount: true };
    expect(exportChoiceContent(unchanged, QuestionType.MULTI_SELECT).settings).toEqual({});
  });

  it('exports no answer count from single choice, which shows none', () => {
    expect(exportChoiceContent(state, QuestionType.SINGLE_SELECT).settings).toEqual({
      shuffle: true,
    });
  });

  it('imports each answer as a new choice, and the settings', () => {
    const imported = importChoiceContent({
      prompt: '<p>Q</p>',
      answers: {
        items: [{ content: '<p>A</p>', correct: true, fixed: true }],
        orientation: 'horizontal',
      },
      settings: { shuffle: true, showAnswerCount: false },
    });
    expect(imported.prompt).toBe('<p>Q</p>');
    expect(imported.shuffle).toBe(true);
    expect(imported.showAnswerCount).toBe(false);
    expect(imported.orientation).toBe('horizontal');
    expect(imported.choices).toEqual([
      { id: expect.stringMatching(/^choice_/), content: '<p>A</p>', correct: true, fixed: true },
    ]);
  });

  it('starts with one blank choice and the default settings when there are no answers', () => {
    const imported = importChoiceContent({ prompt: '<p>Q</p>' });
    expect(imported.choices).toEqual([
      { id: expect.stringMatching(/^choice_/), content: '', correct: false },
    ]);
    expect(imported.shuffle).toBe(false);
    expect(imported.showAnswerCount).toBe(true);
  });
});
