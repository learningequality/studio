/* eslint-disable jest-dom/prefer-to-have-attribute, jest-dom/prefer-to-have-text-content */
// The jest-dom matchers reject XML nodes produced by DOMParser(..., 'text/xml').

import {
  buildGapMatchInteractionXML as buildXML,
  getGaps,
  parseGapMatchInteraction as parse,
} from '../parse';
import { BaseType, Cardinality, QuestionType, SENTINEL_MARKER } from '../../../constants';
import { parseXML } from '../../../serialization/xml';
import { QTIDeclaration } from '../../../serialization/qti/QTIDeclaration';

const SCHEMA = { baseType: BaseType.DIRECTED_PAIR, cardinality: Cardinality.MULTIPLE };

const gapText = (id, content, matchMax = 1) =>
  `<qti-gap-text identifier="${id}" match-max="${matchMax}">${content}</qti-gap-text>`;
const interaction = (...children) =>
  `<qti-gap-match-interaction response-identifier="RESPONSE" shuffle="true" max-associations="2">${children.join('')}</qti-gap-match-interaction>`;
const declaration = (...values) =>
  `<qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="directedPair">
    <qti-correct-response>${values.map(v => `<qti-value>${v}</qti-value>`).join('')}</qti-correct-response>
  </qti-response-declaration>`;

const PROMPT = '<qti-prompt><p>Identify the missing words.</p></qti-prompt>';
const PASSAGE =
  '<p>Now is the <qti-gap identifier="gap_a"/> of our discontent</p>' +
  '<p>Made glorious <qti-gap identifier="gap_b"/> by this sun of York;</p>';
const BODY = interaction(
  PROMPT,
  gapText('choice_winter', 'winter'),
  gapText('choice_spring', 'spring'),
  gapText('choice_summer', 'summer'),
  gapText('choice_autumn', 'autumn'),
  PASSAGE,
);
const DECL = declaration('choice_winter gap_a', 'choice_spring gap_b');

const gap = (id, answerId, answer) =>
  `<qti-gap identifier="${id}" data-studio-correct="${answerId}">${answer}</qti-gap>`;
const blankGap = id => `<qti-gap identifier="${id}"></qti-gap>`;

function makeState(overrides = {}) {
  return {
    responseIdentifier: 'RESPONSE',
    prompt: '<p>Identify the missing words.</p>',
    passage:
      `<p>Now is the ${gap('gap_a', 'choice_winter', 'winter')} of our discontent</p>` +
      `<p>Made glorious ${gap('gap_b', 'choice_spring', 'spring')} by this sun of York;</p>`,
    distractors: [{ id: 'choice_summer', content: 'summer' }],
    ...overrides,
  };
}

const build = state => {
  const { bodyXml, responseDeclarations } = buildXML(state, QuestionType.GAP_MATCH, SCHEMA);
  return {
    root: parseXML(bodyXml).documentElement,
    declaration: QTIDeclaration.fromXML(parseXML(responseDeclarations[0]).documentElement),
    declarationXml: responseDeclarations[0],
  };
};
const gapTextsOf = root =>
  [...root.querySelectorAll('qti-gap-text')].map(el => ({
    id: el.getAttribute('identifier'),
    content: el.textContent,
    matchMax: el.getAttribute('match-max'),
  }));
const gapIdsOf = root =>
  [...root.querySelectorAll('qti-gap')].map(el => el.getAttribute('identifier'));
const roundTrip = state => {
  const { bodyXml, responseDeclarations } = buildXML(state, QuestionType.GAP_MATCH, SCHEMA);
  return parse(bodyXml, responseDeclarations);
};

describe('getGaps()', () => {
  it('reads an answer as the build does, without comments or scripts', () => {
    const passage = `<p>${gap('gap_a', 'choice_w', '<!-- note -->winter<script>x()</script>')}</p>`;
    expect(getGaps(passage)[0].answer).toBe('winter');
  });
});

describe('parse()', () => {
  describe('fallbacks', () => {
    it('returns an empty state when bodyXml is empty', () => {
      expect(parse('', [DECL])).toEqual({
        responseIdentifier: 'RESPONSE',
        prompt: '',
        passage: '',
        distractors: [],
      });
    });

    it('returns an empty state when bodyXml is invalid XML', () => {
      expect(parse('<not-valid', [DECL]).passage).toBe('');
    });

    it('defaults the prompt to an empty string when <qti-prompt> is absent', () => {
      expect(parse(interaction(PASSAGE), []).prompt).toBe('');
    });
  });

  it('reads the prompt HTML', () => {
    expect(parse(BODY, [DECL]).prompt).toBe('<p>Identify the missing words.</p>');
  });

  it('puts each gap answer inside its gap, in passage order', () => {
    expect(getGaps(parse(BODY, [DECL]).passage)).toEqual([
      { id: 'gap_a', answerId: 'choice_winter', answer: 'winter' },
      { id: 'gap_b', answerId: 'choice_spring', answer: 'spring' },
    ]);
  });

  it('keeps the passage text around the gaps', () => {
    expect(parse(BODY, [DECL]).passage).toBe(
      `<p>Now is the ${gap('gap_a', 'choice_winter', 'winter')} of our discontent</p>` +
        `<p>Made glorious ${gap('gap_b', 'choice_spring', 'spring')} by this sun of York;</p>`,
    );
  });

  it('reads a gap inside formatted content', () => {
    const body = interaction(
      gapText('choice_winter', 'winter'),
      '<ul><li><strong>Now is the <qti-gap identifier="gap_a"/></strong></li></ul>',
    );
    const { passage } = parse(body, [declaration('choice_winter gap_a')]);
    expect(passage).toContain(`<strong>Now is the ${gap('gap_a', 'choice_winter', 'winter')}`);
  });

  it('keeps formatting and math in an answer', () => {
    const body = interaction(
      gapText('choice_x', '<strong>x</strong><span data-latex="x^2"/>'),
      '<p><qti-gap identifier="gap_a"/></p>',
    );
    const [{ answer }] = getGaps(parse(body, [declaration('choice_x gap_a')]).passage);
    expect(answer).toBe('<strong>x</strong><span data-latex="x^2"></span>');
  });

  it('reads the gap texts in no pair as distractors, in document order', () => {
    expect(parse(BODY, [DECL]).distractors).toEqual([
      { id: 'choice_summer', content: 'summer' },
      { id: 'choice_autumn', content: 'autumn' },
    ]);
  });

  it('gives a shared gap text to every gap it is paired with', () => {
    const body = interaction(gapText('choice_winter', 'winter', 2), PASSAGE);
    const decl = declaration('choice_winter gap_a', 'choice_winter gap_b');
    expect(getGaps(parse(body, [decl]).passage)).toEqual([
      { id: 'gap_a', answerId: 'choice_winter', answer: 'winter' },
      { id: 'gap_b', answerId: 'choice_winter', answer: 'winter' },
    ]);
  });

  it('leaves a gap with no pair without an answer', () => {
    const body = interaction(gapText('choice_winter', 'winter'), PASSAGE);
    expect(getGaps(parse(body, [declaration('choice_winter gap_a')]).passage)[1]).toEqual({
      id: 'gap_b',
      answerId: null,
      answer: '',
    });
  });

  it('drops a value that names the gap before the gap text', () => {
    const body = interaction(gapText('choice_winter', 'winter'), PASSAGE);
    const state = parse(body, [declaration('gap_a choice_winter')]);
    expect(getGaps(state.passage)[0].answerId).toBeNull();
    expect(state.distractors).toEqual([{ id: 'choice_winter', content: 'winter' }]);
  });

  it('drops a value that names a missing gap text', () => {
    const state = parse(interaction(PASSAGE), [declaration('choice_missing gap_a')]);
    expect(getGaps(state.passage)[0].answerId).toBeNull();
  });

  describe('missing identifiers', () => {
    it('gives a gap without an identifier a new one', () => {
      const body = interaction('<p>Now is the <qti-gap/></p>');
      expect(getGaps(parse(body, []).passage)[0].id).toMatch(/^gap_/);
    });

    it('gives a gap text without an identifier a new one', () => {
      const body = interaction('<qti-gap-text match-max="1">summer</qti-gap-text>', PASSAGE);
      expect(parse(body, []).distractors[0].id).toMatch(/^choice_/);
    });
  });
});

describe('buildXML()', () => {
  it('writes the prompt, the answers in gap order, the distractors, then the passage', () => {
    const { root } = build(
      makeState({
        passage:
          `<p>${gap('gap_a', 'choice_spring', 'spring')}</p>` +
          `<p>${gap('gap_b', 'choice_winter', 'winter')}</p>`,
      }),
    );
    expect([...root.children].map(el => el.localName)).toEqual([
      'qti-prompt',
      'qti-gap-text',
      'qti-gap-text',
      'qti-gap-text',
      'p',
      'p',
    ]);
    expect(gapTextsOf(root).map(text => text.id)).toEqual([
      'choice_spring',
      'choice_winter',
      'choice_summer',
    ]);
  });

  it('writes the interaction attributes', () => {
    const { root } = build(makeState());
    expect(root.getAttribute('response-identifier')).toBe('RESPONSE');
    expect(root.getAttribute('shuffle')).toBe('true');
    expect(root.getAttribute('max-associations')).toBe('2');
  });

  it.each(['', '<p></p>'])('omits <qti-prompt> when the question is %p', prompt => {
    const { root } = build(makeState({ prompt }));
    expect(root.querySelector('qti-prompt')).toBeNull();
  });

  it('writes every gap empty, with only its identifier', () => {
    const { root } = build(makeState());
    for (const el of root.querySelectorAll('qti-gap')) {
      expect(el.childNodes).toHaveLength(0);
      expect(el.getAttributeNames()).toEqual(['identifier']);
    }
  });

  it('writes every answer and distractor with match-max 1', () => {
    expect(gapTextsOf(build(makeState()).root)).toEqual([
      { id: 'choice_winter', content: 'winter', matchMax: '1' },
      { id: 'choice_spring', content: 'spring', matchMax: '1' },
      { id: 'choice_summer', content: 'summer', matchMax: '1' },
    ]);
  });

  it('pairs each answer identifier with its gap identifier, in that order', () => {
    const { declaration: decl, declarationXml } = build(makeState());
    expect(decl.correctResponse).toEqual([
      ['choice_winter', 'gap_a'],
      ['choice_spring', 'gap_b'],
    ]);
    expect(declarationXml).toContain('base-type="directedPair"');
    expect(declarationXml).toContain('cardinality="multiple"');
  });

  it('writes answers with the same content as one gap text paired with every gap', () => {
    const { root, declaration: decl } = build(
      makeState({
        passage:
          `<p>${gap('gap_a', 'choice_winter', 'winter')}</p>` +
          `<p>${gap('gap_b', 'choice_other', '<strong>winter</strong>')}</p>`,
        distractors: [],
      }),
    );
    expect(gapTextsOf(root)).toEqual([{ id: 'choice_winter', content: 'winter', matchMax: '2' }]);
    expect(decl.correctResponse).toEqual([
      ['choice_winter', 'gap_a'],
      ['choice_winter', 'gap_b'],
    ]);
  });

  it('writes a blank gap with no gap text and no pair', () => {
    const { root, declaration: decl } = build(
      makeState({
        passage: `<p>${gap('gap_a', 'choice_winter', 'winter')} ${blankGap('gap_b')}</p>`,
        distractors: [],
      }),
    );
    expect(gapIdsOf(root)).toEqual(['gap_a', 'gap_b']);
    expect(gapTextsOf(root).map(text => text.id)).toEqual(['choice_winter']);
    expect(decl.correctResponse).toEqual([['choice_winter', 'gap_a']]);
    expect(root.getAttribute('max-associations')).toBe('2');
  });

  it('writes no correct response when no gap has an answer', () => {
    const { declarationXml } = build(makeState({ passage: `<p>${blankGap('gap_a')}</p>` }));
    expect(declarationXml).not.toContain('qti-correct-response');
  });

  it('keeps a gap inside formatted content in place', () => {
    const { root } = build(
      makeState({ passage: `<p><strong>Now ${gap('gap_a', 'choice_w', 'winter')}</strong></p>` }),
    );
    expect(root.querySelector('p > strong > qti-gap').getAttribute('identifier')).toBe('gap_a');
  });

  it('wraps passage text outside a block in a paragraph', () => {
    const { root } = build(makeState({ passage: `Now ${gap('gap_a', 'choice_w', 'winter')}` }));
    expect(root.querySelector('p > qti-gap')).not.toBeNull();
  });

  describe('identifiers', () => {
    it('keeps the other identifiers when a gap is removed', () => {
      const { root } = build(
        makeState({
          passage: `<p>Made glorious ${gap('gap_b', 'choice_spring', 'spring')}</p>`,
        }),
      );
      expect(gapIdsOf(root)).toEqual(['gap_b']);
      expect(gapTextsOf(root).map(text => text.id)).toEqual(['choice_spring', 'choice_summer']);
    });

    it('keeps the identifiers when the gaps are reordered', () => {
      const { root, declaration: decl } = build(
        makeState({
          passage:
            `<p>${gap('gap_b', 'choice_spring', 'spring')}</p>` +
            `<p>${gap('gap_a', 'choice_winter', 'winter')}</p>`,
        }),
      );
      expect(gapIdsOf(root)).toEqual(['gap_b', 'gap_a']);
      expect(decl.correctResponse).toEqual([
        ['choice_spring', 'gap_b'],
        ['choice_winter', 'gap_a'],
      ]);
    });

    it('gives a repeated gap identifier a numbered suffix', () => {
      const { root } = build(
        makeState({
          passage: `<p>${gap('gap_a', 'choice_w', 'winter')} ${gap('gap_a', 'choice_s', 'spring')}</p>`,
        }),
      );
      expect(gapIdsOf(root)).toEqual(['gap_a', 'gap_a_2']);
    });

    it('gives an answer whose identifier is taken by other content a numbered suffix', () => {
      const { root } = build(
        makeState({
          passage: `<p>${gap('gap_a', 'choice_w', 'winter')} ${gap('gap_b', 'choice_w', 'spring')}</p>`,
          distractors: [],
        }),
      );
      expect(gapTextsOf(root).map(text => text.id)).toEqual(['choice_w', 'choice_w_2']);
    });

    it('skips a numbered suffix that is already in use', () => {
      const { root } = build(
        makeState({
          passage: `<p>${gap('gap_a', 'choice_w', 'winter')} ${gap('gap_b', 'choice_w', 'spring')}</p>`,
          distractors: [{ id: 'choice_w_2', content: 'summer' }],
        }),
      );
      expect(gapTextsOf(root).map(text => text.id)).toEqual([
        'choice_w',
        'choice_w_3',
        'choice_w_2',
      ]);
    });

    it('derives a missing answer identifier from its gap identifier', () => {
      const { root } = build(
        makeState({
          passage: '<p><qti-gap identifier="gap_a">winter</qti-gap></p>',
          distractors: [],
        }),
      );
      expect(gapTextsOf(root)[0].id).toBe('choice_a');
    });

    it('keeps a distractor identifier that a derived answer identifier would take', () => {
      const { root } = build(
        makeState({
          passage: '<p><qti-gap identifier="gap_a">winter</qti-gap></p>',
          distractors: [{ id: 'choice_a', content: 'summer' }],
        }),
      );
      expect(gapTextsOf(root).map(text => text.id)).toEqual(['choice_a_2', 'choice_a']);
    });

    it('gives a gap and a distractor without an identifier new ones', () => {
      const { root, declaration: decl } = build(
        makeState({
          passage: '<p><qti-gap data-studio-correct="choice_w">winter</qti-gap></p>',
          distractors: [{ content: 'summer' }],
        }),
      );
      const [gapId] = gapIdsOf(root);
      expect(gapId).toMatch(/^gap_/);
      expect(gapTextsOf(root)[1].id).toMatch(/^choice_/);
      expect(decl.correctResponse).toEqual([['choice_w', gapId]]);
    });

    it('derives the same identifiers each time it builds the same state', () => {
      const state = makeState({
        passage:
          `<p><qti-gap identifier="gap_a">winter</qti-gap> ` +
          `${gap('gap_b', 'choice_w', 'spring')} ${gap('gap_b', 'choice_w', 'autumn')}</p>`,
      });
      expect(buildXML(state, QuestionType.GAP_MATCH, SCHEMA)).toEqual(
        buildXML(state, QuestionType.GAP_MATCH, SCHEMA),
      );
    });
  });
});

describe('round trip', () => {
  it('returns the same question, passage, answers, distractors and identifiers', () => {
    const state = parse(BODY, [DECL]);
    expect(roundTrip(state)).toEqual(state);
  });

  it('reopens an item with an empty question with an empty question', () => {
    expect(roundTrip(makeState({ prompt: '' })).prompt).toBe('');
  });

  it('reopens a shared answer as two gaps with that answer', () => {
    const state = makeState({
      passage:
        `<p>${gap('gap_a', 'choice_winter', 'winter')}</p>` +
        `<p>${gap('gap_b', 'choice_winter', 'winter')}</p>`,
    });
    expect(roundTrip(state)).toEqual(state);
  });

  describe('items that the schema needs filled', () => {
    const sentinelsOf = root => root.querySelectorAll(`qti-gap-text[${SENTINEL_MARKER}]`);
    const passageBlocksOf = root => [...root.children].filter(el => el.localName === 'p');

    it('writes a sentinel gap text and an empty paragraph for a new question', () => {
      const state = makeState({ prompt: '', passage: '', distractors: [] });
      const { root } = build(state);
      expect(sentinelsOf(root)).toHaveLength(1);
      expect(passageBlocksOf(root).map(p => p.childNodes.length)).toEqual([0]);
      expect(roundTrip(state)).toEqual(state);
    });

    it('writes a sentinel gap text when the only gap is blank', () => {
      const state = makeState({
        passage: `<p>Now is the ${blankGap('gap_a')} of our discontent</p>`,
        distractors: [],
      });
      expect(sentinelsOf(build(state).root)).toHaveLength(1);
      expect(roundTrip(state)).toEqual(state);
    });

    it('writes an empty paragraph and no sentinel for an empty passage with a distractor', () => {
      const state = makeState({ passage: '' });
      const { root } = build(state);
      expect(sentinelsOf(root)).toHaveLength(0);
      expect(passageBlocksOf(root).map(p => p.childNodes.length)).toEqual([0]);
      expect(roundTrip(state)).toEqual(state);
    });
  });

  it('reopens a blank gap with no answer', () => {
    const state = makeState({
      passage: `<p>${gap('gap_a', 'choice_winter', 'winter')} ${blankGap('gap_b')}</p>`,
    });
    expect(getGaps(roundTrip(state).passage)).toEqual([
      { id: 'gap_a', answerId: 'choice_winter', answer: 'winter' },
      { id: 'gap_b', answerId: null, answer: '' },
    ]);
  });
});
