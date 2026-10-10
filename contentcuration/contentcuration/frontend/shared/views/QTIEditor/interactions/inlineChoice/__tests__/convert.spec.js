import flatMap from 'lodash/flatMap';
import { ContentLevel, ConversionLoss, QuestionType } from '../../../constants';
import { carryContent } from '../../../conversion';
import { inlineChoiceInteractionDescriptor as descriptor } from '../Descriptor';
import { exportInlineChoiceContent, importInlineChoiceContent } from '../convert';
import { getDropdowns } from '../parse';

const dropdown = (name, options, correct) =>
  `<qti-inline-choice-interaction response-identifier="response_${name}"` +
  (correct ? ` data-studio-correct="choice_${correct}"` : '') +
  '>' +
  options
    .map(text => `<qti-inline-choice identifier="choice_${text}">${text}</qti-inline-choice>`)
    .join('') +
  '</qti-inline-choice-interaction>';

/** A gap match passage, as gap match exports it: answers inline, one shared pool. */
const gapMatchPassage = {
  html: '<p>Now is the <span data-studio-blank="0"></span> of our <span data-studio-blank="1"></span>.</p>',
  blanks: [
    { answer: '<em>winter</em>', options: [] },
    { answer: 'discontent', options: [] },
  ],
  distractors: ['summer', 'winter'],
  contentLevel: ContentLevel.INLINE,
};

const summary = passage =>
  getDropdowns(passage).map(({ options, correctId }) => ({
    options: options.map(({ text }) => text),
    correct: options.find(({ id }) => id === correctId)?.text ?? null,
  }));

describe('inline choice conversion', () => {
  // Its shuffle is saved on its dropdowns, which a question with no passage has none of.
  it('takes a plain passage, and no other type’s settings', () => {
    expect(descriptor.getConversionFormat(QuestionType.INLINE_CHOICE)).toEqual({
      passage: { contentLevel: ContentLevel.PLAIN },
    });
  });

  it('exports each dropdown as a blank, its correct option the answer, and the settings', () => {
    const state = {
      prompt: '<p>Q</p>',
      passage: `<p>The ${dropdown('a', ['Moon', 'Sun'], 'Sun')} and ${dropdown('b', ['x'])}</p>`,
      shuffle: true,
    };
    expect(exportInlineChoiceContent(state)).toEqual({
      prompt: '<p>Q</p>',
      passage: {
        html: '<p>The <span data-studio-blank="0"></span> and <span data-studio-blank="1"></span></p>',
        blanks: [
          { answer: 'Sun', options: ['Moon'] },
          { answer: null, options: ['x'] },
        ],
        distractors: [],
        contentLevel: ContentLevel.PLAIN,
      },
      settings: { shuffle: true },
    });
  });

  it('imports a passage from gap match, each dropdown offering the whole pool', () => {
    const { carried, losses } = carryContent(
      { prompt: '<p>Q</p>', passage: gapMatchPassage },
      descriptor.getConversionFormat(QuestionType.INLINE_CHOICE),
    );
    // The answer was in italics, which an option can't hold.
    expect(losses).toEqual([ConversionLoss.FORMATTING_REMOVED]);

    const state = importInlineChoiceContent(carried);
    expect(state.prompt).toBe('<p>Q</p>');
    // Each dropdown leads with its answer.
    expect(state.shuffle).toBe(true);
    expect(summary(state.passage)).toEqual([
      { options: ['winter', 'discontent', 'summer'], correct: 'winter' },
      { options: ['discontent', 'winter', 'summer'], correct: 'discontent' },
    ]);
  });

  it('gives a blank with no answer and nothing to offer one empty option, unmarked', () => {
    const state = importInlineChoiceContent({
      prompt: '',
      passage: {
        html: '<p><span data-studio-blank="0"></span></p>',
        blanks: [{ answer: null, options: [] }],
        distractors: [],
        contentLevel: ContentLevel.PLAIN,
      },
    });
    expect(summary(state.passage)).toEqual([{ options: [''], correct: null }]);
  });

  it('gives every dropdown its own identifiers', () => {
    const { carried } = carryContent(
      { prompt: '', passage: gapMatchPassage },
      descriptor.getConversionFormat(QuestionType.INLINE_CHOICE),
    );
    const dropdowns = getDropdowns(importInlineChoiceContent(carried).passage);
    const ids = flatMap(dropdowns, d => [d.responseIdentifier, ...d.options.map(o => o.id)]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('imports a new question with the question only, when there is no passage', () => {
    expect(importInlineChoiceContent({ prompt: '<p>Q</p>' })).toEqual({
      prompt: '<p>Q</p>',
      passage: '',
      shuffle: false,
    });
  });

  it('writes a passage the inline choice editor reads back the same', () => {
    const { carried } = carryContent(
      { prompt: '<p>Q</p>', passage: gapMatchPassage },
      descriptor.getConversionFormat(QuestionType.INLINE_CHOICE),
    );
    const state = importInlineChoiceContent(carried);
    const { bodyXml, responseDeclarations } = descriptor.buildXML(
      state,
      QuestionType.INLINE_CHOICE,
    );
    const reopened = descriptor.parse(bodyXml, responseDeclarations);
    expect(summary(reopened.passage)).toEqual(summary(state.passage));
    expect(descriptor.validate(reopened)).toEqual([]);
  });
});
