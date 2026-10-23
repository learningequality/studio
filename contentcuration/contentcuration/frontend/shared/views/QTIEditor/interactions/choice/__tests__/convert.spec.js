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

  it('exports the question, each choice with its mark, and the layout settings', () => {
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
    expect(exportChoiceContent(state)).toEqual({
      prompt: '<p>Q</p>',
      answers: {
        correctCriterion: CorrectCriterion.SELECTED,
        contentLevel: ContentLevel.RICH,
        items: [
          { content: '<p>A</p>', correct: true, fixed: true },
          { content: '<p>B</p>', correct: false, fixed: false },
        ],
        shuffle: true,
        orientation: 'horizontal',
      },
    });
  });

  it('imports each answer as a new choice', () => {
    const state = importChoiceContent({
      prompt: '<p>Q</p>',
      answers: {
        items: [{ content: '<p>A</p>', correct: true, fixed: true }],
        shuffle: true,
        orientation: 'horizontal',
      },
    });
    expect(state.prompt).toBe('<p>Q</p>');
    expect(state.shuffle).toBe(true);
    expect(state.orientation).toBe('horizontal');
    expect(state.choices).toEqual([
      { id: expect.stringMatching(/^choice_/), content: '<p>A</p>', correct: true, fixed: true },
    ]);
  });

  it('starts with one blank choice and the default settings when there are no answers', () => {
    const state = importChoiceContent({ prompt: '<p>Q</p>' });
    expect(state.choices).toEqual([
      { id: expect.stringMatching(/^choice_/), content: '', correct: false },
    ]);
    expect(state.shuffle).toBe(false);
    expect(state.showAnswerCount).toBe(true);
  });
});
