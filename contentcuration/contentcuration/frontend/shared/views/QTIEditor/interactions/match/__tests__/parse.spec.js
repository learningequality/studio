/* eslint-disable jest-dom/prefer-to-have-attribute, jest-dom/prefer-to-have-text-content */
// The jest-dom matchers reject XML nodes produced by DOMParser(..., 'text/xml').

import { buildMatchInteractionXML as buildXML, parseMatchInteraction as parse } from '../parse';
import { MATCH_XML, MATCH_DECL_XML } from '../../../utils/testingFixtures';
import { BaseType, Cardinality, QuestionType } from '../../../constants';
import { parseXML } from '../../../serialization/xml';

const contentsOf = choices => choices.map(choice => choice.content);
const matchContents = rows => rows.map(row => contentsOf(row.matches));

const SCHEMA = { baseType: BaseType.DIRECTED_PAIR, cardinality: Cardinality.MULTIPLE };

const parseXmlString = xml => parseXML(xml).documentElement;

const matchSet = choices => `<qti-simple-match-set>${choices}</qti-simple-match-set>`;
const choice = (id, content) =>
  `<qti-simple-associable-choice identifier="${id}" match-max="1">${content}</qti-simple-associable-choice>`;
const interaction = (...sets) =>
  `<qti-match-interaction response-identifier="RESPONSE" shuffle="true">${sets.join('')}</qti-match-interaction>`;
const declaration = (...values) =>
  `<qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="directedPair">
    <qti-correct-response>${values.map(v => `<qti-value>${v}</qti-value>`).join('')}</qti-correct-response>
  </qti-response-declaration>`;

const ROWS = matchSet(choice('row_dog', 'Dog') + choice('row_eagle', 'Eagle'));
const RESPONSES = matchSet(
  choice('choice_mammal', 'Mammal') + choice('choice_bird', 'Bird') + choice('choice_fur', 'Fur'),
);

describe('parse()', () => {
  describe('fallbacks', () => {
    const expectDefaultState = state => {
      expect(state.rows).toHaveLength(1);
      const [row] = state.rows;
      expect(row.id).toMatch(/^row_/);
      expect(row.content).toBe('');
      expect(row.matches).toHaveLength(1);
      expect(row.matches[0].id).toMatch(/^choice_/);
      expect(row.matches[0].content).toBe('');
      expect(state.distractors).toEqual([]);
    };

    it('seeds one row holding one blank answer when bodyXml is empty', () => {
      expectDefaultState(parse('', [MATCH_DECL_XML]));
    });

    it('returns the default state when bodyXml is invalid XML', () => {
      expectDefaultState(parse('<not-valid', [MATCH_DECL_XML]));
    });

    it('returns the default state for a single match set', () => {
      expectDefaultState(parse(interaction(ROWS), []));
    });

    it('returns the default state for three match sets', () => {
      expectDefaultState(parse(interaction(ROWS, RESPONSES, RESPONSES), []));
    });

    it('defaults prompt to an empty string when <qti-prompt> is absent', () => {
      expect(parse(interaction(ROWS, RESPONSES), []).prompt).toBe('');
    });
  });

  describe('rows and answers', () => {
    it('reads the prompt HTML', () => {
      expect(parse(MATCH_XML, [MATCH_DECL_XML]).prompt).toContain('Match each animal');
    });

    it('builds rows from the first set in document order', () => {
      const state = parse(MATCH_XML, [MATCH_DECL_XML]);
      expect(contentsOf(state.rows)).toEqual(['Dog', 'Eagle', 'Frog']);
      expect(state.rows.map(row => row.id)).toEqual(['row_dog', 'row_eagle', 'row_frog']);
    });

    it('gives each row the answers the correct response names for it', () => {
      const state = parse(MATCH_XML, [MATCH_DECL_XML]);
      expect(matchContents(state.rows)).toEqual([['Mammal'], ['Bird'], ['Amphibian']]);
      expect(state.rows[0].matches[0].id).toBe('choice_mammal');
    });

    it('orders a row holding two answers by the correct response', () => {
      const decl = declaration('row_dog choice_fur', 'row_dog choice_mammal');
      expect(matchContents(parse(interaction(ROWS, RESPONSES), [decl]).rows)).toEqual([
        ['Fur', 'Mammal'],
        [],
      ]);
    });

    it('puts a response named by two rows in both rows', () => {
      const decl = declaration('row_dog choice_fur', 'row_eagle choice_fur');
      expect(matchContents(parse(interaction(ROWS, RESPONSES), [decl]).rows)).toEqual([
        ['Fur'],
        ['Fur'],
      ]);
    });

    it('drops a value naming the response before the row', () => {
      const decl = declaration('choice_mammal row_dog', 'row_eagle choice_bird');
      expect(matchContents(parse(interaction(ROWS, RESPONSES), [decl]).rows)).toEqual([
        [],
        ['Bird'],
      ]);
    });

    it('drops a value naming an identifier absent from its set', () => {
      const decl = declaration(
        'row_dog choice_missing',
        'row_missing choice_mammal',
        'row_eagle choice_bird',
      );
      expect(matchContents(parse(interaction(ROWS, RESPONSES), [decl]).rows)).toEqual([
        [],
        ['Bird'],
      ]);
    });

    it('drops an empty <qti-value>', () => {
      const decl = declaration('', 'row_eagle choice_bird');
      expect(matchContents(parse(interaction(ROWS, RESPONSES), [decl]).rows)).toEqual([
        [],
        ['Bird'],
      ]);
    });

    it('leaves every row without answers when no declarations are passed', () => {
      const state = parse(MATCH_XML, []);
      expect(matchContents(state.rows)).toEqual([[], [], []]);
      expect(contentsOf(state.distractors)).toEqual(['Bird', 'Mammal', 'Amphibian', 'Reptile']);
    });
  });

  describe('distractors', () => {
    it('treats responses no value names as distractors, in document order', () => {
      const decl = declaration('row_dog choice_bird');
      const state = parse(interaction(ROWS, RESPONSES), [decl]);
      expect(state.distractors).toEqual([
        { id: 'choice_mammal', content: 'Mammal' },
        { id: 'choice_fur', content: 'Fur' },
      ]);
    });

    it('treats a response named only by a dropped value as a distractor', () => {
      const decl = declaration('choice_mammal row_dog');
      const state = parse(interaction(ROWS, RESPONSES), [decl]);
      expect(contentsOf(state.distractors)).toEqual(['Mammal', 'Bird', 'Fur']);
    });

    it('imports the unlimited match-max="0" by appearance', () => {
      const responses = `<qti-simple-match-set>
        <qti-simple-associable-choice identifier="choice_mammal" match-max="0">Mammal</qti-simple-associable-choice>
        <qti-simple-associable-choice identifier="choice_bird" match-max="0">Bird</qti-simple-associable-choice>
      </qti-simple-match-set>`;
      const state = parse(interaction(ROWS, responses), [declaration('row_dog choice_mammal')]);
      expect(matchContents(state.rows)).toEqual([['Mammal'], []]);
      expect(contentsOf(state.distractors)).toEqual(['Bird']);
    });

    it('reads a named response with surplus match-max as one answer and no distractor', () => {
      const responses = `<qti-simple-match-set>
        <qti-simple-associable-choice identifier="choice_mammal" match-max="3">Mammal</qti-simple-associable-choice>
      </qti-simple-match-set>`;
      const state = parse(interaction(ROWS, responses), [declaration('row_dog choice_mammal')]);
      expect(matchContents(state.rows)).toEqual([['Mammal'], []]);
      expect(state.distractors).toEqual([]);
    });
  });

  describe('identifiers', () => {
    it('assigns row_ and choice_ slugs to choices without an identifier', () => {
      const xml = interaction(
        matchSet('<qti-simple-associable-choice>Dog</qti-simple-associable-choice>'),
        matchSet('<qti-simple-associable-choice>Mammal</qti-simple-associable-choice>'),
      );
      const state = parse(xml, []);
      expect(state.rows[0].id).toMatch(/^row_/);
      expect(state.distractors[0].id).toMatch(/^choice_/);
    });

    // Identifiers are used as lookup keys, so one that names an inherited Object
    // member must not resolve to that member.
    it('resolves identifiers that are Object.prototype member names', () => {
      const xml = interaction(
        matchSet(choice('constructor', 'Dog')),
        matchSet(choice('toString', 'Mammal') + choice('choice_bird', 'Bird')),
      );
      const state = parse(xml, [declaration('constructor toString')]);
      expect(matchContents(state.rows)).toEqual([['Mammal']]);
      expect(contentsOf(state.distractors)).toEqual(['Bird']);
    });

    it('resolves a value whose row and response share an identifier', () => {
      const xml = interaction(
        matchSet(choice('shared', 'Dog')),
        matchSet(choice('shared', 'Mammal')),
      );
      const state = parse(xml, [declaration('shared shared')]);
      expect(matchContents(state.rows)).toEqual([['Mammal']]);
      expect(state.distractors).toEqual([]);
    });

    it('reads responseIdentifier from the attribute', () => {
      const xml = `<qti-match-interaction response-identifier="RESPONSE_2">${ROWS}${RESPONSES}</qti-match-interaction>`;
      expect(parse(xml, []).responseIdentifier).toBe('RESPONSE_2');
    });
  });
});

describe('buildXML()', () => {
  const baseState = {
    responseIdentifier: 'RESPONSE',
    prompt: '<p>Match each animal to its class.</p>',
    rows: [
      {
        id: 'row_dog',
        content: 'Dog',
        matches: [
          { id: 'choice_mammal', content: 'Mammal' },
          { id: 'choice_fur', content: 'Fur' },
        ],
      },
      { id: 'row_eagle', content: 'Eagle', matches: [{ id: 'choice_bird', content: 'Bird' }] },
    ],
    distractors: [{ id: 'choice_reptile', content: 'Reptile' }],
  };

  const withRows = (rows, distractors = []) => ({ ...baseState, rows, distractors });
  const row = (id, content, matches = []) => ({ id, content, matches });

  const build = state => buildXML(state, QuestionType.MATCH, SCHEMA);
  const setsOf = root => [...root.querySelectorAll('qti-simple-match-set')];
  const choicesIn = setEl => [...setEl.querySelectorAll('qti-simple-associable-choice')];
  const describeSet = setEl =>
    choicesIn(setEl).map(el => [
      el.getAttribute('identifier'),
      el.textContent,
      el.getAttribute('match-max'),
    ]);
  const rowsOf = result => describeSet(setsOf(parseXmlString(result.bodyXml))[0]);
  const responsesOf = result => describeSet(setsOf(parseXmlString(result.bodyXml))[1]);
  const valuesOf = result =>
    [...parseXmlString(result.responseDeclarations[0]).querySelectorAll('qti-value')].map(n =>
      n.textContent.trim(),
    );

  describe('interaction attributes', () => {
    it('emits the response identifier, shuffle, and one association per answer', () => {
      const root = parseXmlString(build(baseState).bodyXml);
      expect(root.getAttribute('response-identifier')).toBe('RESPONSE');
      expect(root.getAttribute('shuffle')).toBe('true');
      expect(root.getAttribute('max-associations')).toBe('3');
    });

    it('emits <qti-prompt> when the prompt is filled', () => {
      const root = parseXmlString(build(baseState).bodyXml);
      expect(root.querySelector('qti-prompt').textContent).toBe('Match each animal to its class.');
    });

    it('omits <qti-prompt> when prompt is empty', () => {
      const root = parseXmlString(build({ ...baseState, prompt: '' }).bodyXml);
      expect(root.querySelector('qti-prompt')).toBeNull();
    });
  });

  describe('match sets', () => {
    it('emits the row set, then the response set, in state order', () => {
      expect(rowsOf(build(baseState))).toEqual([
        ['row_dog', 'Dog', '2'],
        ['row_eagle', 'Eagle', '1'],
      ]);
      expect(responsesOf(build(baseState))).toEqual([
        ['choice_mammal', 'Mammal', '1'],
        ['choice_fur', 'Fur', '1'],
        ['choice_bird', 'Bird', '1'],
        ['choice_reptile', 'Reptile', '1'],
      ]);
    });

    it('emits two sets for a state with no answers and no distractors', () => {
      const root = parseXmlString(build(withRows([row('row_dog', 'Dog')])).bodyXml);
      expect(setsOf(root)).toHaveLength(2);
      expect(describeSet(setsOf(root)[0])).toEqual([['row_dog', 'Dog', '1']]);
      expect(choicesIn(setsOf(root)[1])).toEqual([]);
    });

    it('emits two sets for a state with no rows', () => {
      expect(setsOf(parseXmlString(build(withRows([])).bodyXml))).toHaveLength(2);
    });
  });

  describe('responses', () => {
    const mammal = { id: 'choice_mammal', content: 'Mammal' };

    it('merges an answer shared by two rows into one choice with match-max="2"', () => {
      const state = withRows([
        row('row_dog', 'Dog', [mammal]),
        row('row_whale', 'Whale', [{ id: 'choice_other', content: '<p>Mammal</p>' }]),
      ]);
      const result = build(state);
      expect(responsesOf(result)).toEqual([['choice_mammal', 'Mammal', '2']]);
      expect(valuesOf(result)).toEqual(['row_dog choice_mammal', 'row_whale choice_mammal']);
    });

    it('counts an answer repeated within one row twice', () => {
      const state = withRows([row('row_dog', 'Dog', [mammal, { ...mammal }])]);
      expect(responsesOf(build(state))).toEqual([['choice_mammal', 'Mammal', '2']]);
    });

    it('keeps two equal distractors as two choices', () => {
      const distractors = [
        { id: 'choice_a', content: 'Reptile' },
        { id: 'choice_b', content: 'Reptile' },
      ];
      expect(responsesOf(build(withRows([row('row_dog', 'Dog')], distractors)))).toEqual([
        ['choice_a', 'Reptile', '1'],
        ['choice_b', 'Reptile', '1'],
      ]);
    });

    it('keeps a distractor equal to an answer as a separate choice', () => {
      const state = withRows(
        [row('row_dog', 'Dog', [mammal])],
        [{ id: 'choice_other', content: 'Mammal' }],
      );
      expect(responsesOf(build(state))).toEqual([
        ['choice_mammal', 'Mammal', '1'],
        ['choice_other', 'Mammal', '1'],
      ]);
    });

    it('emits a row prompt equal to an answer in both sets', () => {
      const state = withRows([row('row_mammal', 'Mammal', [mammal])]);
      const result = build(state);
      expect(rowsOf(result)).toEqual([['row_mammal', 'Mammal', '1']]);
      expect(responsesOf(result)).toEqual([['choice_mammal', 'Mammal', '1']]);
    });

    it('never merges blank answers', () => {
      const state = withRows([
        row('row_dog', 'Dog', [{ id: 'choice_a', content: '' }]),
        row('row_eagle', 'Eagle', [{ id: 'choice_b', content: '<p></p>' }]),
      ]);
      expect(responsesOf(build(state)).map(([id]) => id)).toEqual(['choice_a', 'choice_b']);
    });

    it('keeps two different image-only answers as two choices', () => {
      const state = withRows([
        row('row_dog', 'Dog', [{ id: 'choice_a', content: '<img src="a.png">' }]),
        row('row_eagle', 'Eagle', [{ id: 'choice_b', content: '<img src="b.png">' }]),
      ]);
      expect(responsesOf(build(state)).map(([id, , matchMax]) => [id, matchMax])).toEqual([
        ['choice_a', '1'],
        ['choice_b', '1'],
      ]);
    });
  });

  describe('identifiers', () => {
    const idsIn = result => [
      ...rowsOf(result).map(([id]) => id),
      ...responsesOf(result).map(([id]) => id),
    ];

    it('gives a later equal answer the id of its first appearance', () => {
      const state = withRows([
        row('row_dog', 'Dog', [{ id: 'choice_first', content: 'Mammal' }]),
        row('row_whale', 'Whale', [{ id: 'choice_second', content: 'Mammal' }]),
      ]);
      const result = build(state);
      expect(idsIn(result)).not.toContain('choice_second');
      expect(valuesOf(result)).toEqual(['row_dog choice_first', 'row_whale choice_first']);
    });

    it('reassigns an answer reusing an id bound to other content', () => {
      const state = withRows([
        row('row_dog', 'Dog', [{ id: 'choice_mammal', content: 'Mammal' }]),
        row('row_eagle', 'Eagle', [{ id: 'choice_mammal', content: 'Bird' }]),
      ]);
      const result = build(state);
      const [[mammalId], [birdId]] = responsesOf(result);
      expect(mammalId).toBe('choice_mammal');
      expect(birdId).toMatch(/^choice_/);
      expect(birdId).not.toBe('choice_mammal');
      expect(valuesOf(result)).toEqual(['row_dog choice_mammal', `row_eagle ${birdId}`]);
    });

    it('reassigns a response reusing a row id', () => {
      const result = build(withRows([row('shared', 'Dog', [{ id: 'shared', content: 'Mammal' }])]));
      const [[responseId]] = responsesOf(result);
      expect(rowsOf(result)[0][0]).toBe('shared');
      expect(responseId).toMatch(/^choice_/);
      expect(valuesOf(result)).toEqual([`shared ${responseId}`]);
    });

    it('reassigns a row reusing another row id', () => {
      const state = withRows([
        row('row_dog', 'Dog', [{ id: 'choice_mammal', content: 'Mammal' }]),
        row('row_dog', 'Eagle', [{ id: 'choice_bird', content: 'Bird' }]),
      ]);
      const result = build(state);
      const [[first], [second]] = rowsOf(result);
      expect(first).toBe('row_dog');
      expect(second).toMatch(/^row_/);
      expect(second).not.toBe('row_dog');
      expect(valuesOf(result)).toEqual(['row_dog choice_mammal', `${second} choice_bird`]);
    });

    it('reassigns a distractor reusing an answer id', () => {
      const state = withRows(
        [row('row_dog', 'Dog', [{ id: 'choice_mammal', content: 'Mammal' }])],
        [{ id: 'choice_mammal', content: 'Reptile' }],
      );
      const [, [distractorId, content]] = responsesOf(build(state));
      expect(content).toBe('Reptile');
      expect(distractorId).toMatch(/^choice_/);
      expect(distractorId).not.toBe('choice_mammal');
    });

    it('assigns ids to a row and answer without one', () => {
      const state = withRows([row('', 'Dog', [{ id: '', content: 'Mammal' }])]);
      const result = build(state);
      expect(rowsOf(result)[0][0]).toMatch(/^row_/);
      expect(responsesOf(result)[0][0]).toMatch(/^choice_/);
    });
  });

  describe('response declaration', () => {
    it('emits one "rowId responseId" <qti-value> per answer, by row then position', () => {
      expect(valuesOf(build(baseState))).toEqual([
        'row_dog choice_mammal',
        'row_dog choice_fur',
        'row_eagle choice_bird',
      ]);
    });

    it('omits <qti-correct-response> when no row has an answer', () => {
      const state = withRows([row('row_dog', 'Dog')], baseState.distractors);
      const { bodyXml, responseDeclarations } = build(state);
      expect(
        parseXmlString(responseDeclarations[0]).querySelector('qti-correct-response'),
      ).toBeNull();
      expect(parseXmlString(bodyXml).getAttribute('max-associations')).toBe('0');
    });
  });
});

describe('parse → buildXML → parse round-trip', () => {
  const roundTrip = state => {
    const { bodyXml, responseDeclarations } = buildXML(state, QuestionType.MATCH, SCHEMA);
    return parse(bodyXml, responseDeclarations);
  };

  it('preserves the fixture', () => {
    const original = parse(MATCH_XML, [MATCH_DECL_XML]);
    expect(roundTrip(original)).toEqual(original);
  });

  it('preserves a row holding two answers', () => {
    const original = parse(interaction(ROWS, RESPONSES), [
      declaration('row_dog choice_mammal', 'row_dog choice_fur'),
    ]);
    expect(roundTrip(original)).toEqual(original);
  });

  it('preserves a response shared by two rows', () => {
    const original = parse(interaction(ROWS, RESPONSES), [
      declaration('row_dog choice_fur', 'row_eagle choice_fur'),
    ]);
    expect(roundTrip(original)).toEqual(original);
  });

  it('preserves two distractors with the same content', () => {
    const state = {
      responseIdentifier: 'RESPONSE',
      prompt: '',
      rows: [
        { id: 'row_dog', content: 'Dog', matches: [{ id: 'choice_mammal', content: 'Mammal' }] },
      ],
      distractors: [
        { id: 'choice_a', content: 'Reptile' },
        { id: 'choice_b', content: 'Reptile' },
      ],
    };
    expect(roundTrip(state)).toEqual(state);
  });

  it('preserves the default state', () => {
    const original = parse('', []);
    expect(roundTrip(original)).toEqual(original);
  });
});
