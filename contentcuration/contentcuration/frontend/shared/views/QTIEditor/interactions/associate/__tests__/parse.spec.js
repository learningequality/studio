/* eslint-disable jest-dom/prefer-to-have-attribute, jest-dom/prefer-to-have-text-content */
// The jest-dom matchers reject XML nodes produced by DOMParser(..., 'text/xml').

import {
  buildAssociateInteractionXML as buildXML,
  parseAssociateInteraction as parse,
} from '../parse';
import { ASSOCIATE_XML, ASSOCIATE_DECL_XML } from '../../../utils/testingFixtures';
import { BaseType, Cardinality, QuestionType } from '../../../constants';
import { parseXML } from '../../../serialization/parseItem';

const contentsOf = pairs => pairs.map(pair => pair.map(choice => choice.content));

const SCHEMA = { baseType: BaseType.PAIR, cardinality: Cardinality.MULTIPLE };

const parseXmlString = xml => parseXML(xml).documentElement;

describe('parse()', () => {
  describe('fallbacks', () => {
    it('seeds one pair of two blank choices with distinct ids when bodyXml is empty', () => {
      const state = parse('', [ASSOCIATE_DECL_XML]);
      expect(contentsOf(state.pairs)).toEqual([['', '']]);
      expect(state.distractors).toEqual([]);
      const [[first, second]] = state.pairs;
      expect(first.id).toMatch(/^choice_/);
      expect(second.id).toMatch(/^choice_/);
      expect(first.id).not.toBe(second.id);
    });

    it('returns the default state when bodyXml is invalid XML', () => {
      const state = parse('<not-valid', [ASSOCIATE_DECL_XML]);
      expect(contentsOf(state.pairs)).toEqual([['', '']]);
      expect(state.distractors).toEqual([]);
    });

    it('defaults prompt to an empty string when <qti-prompt> is absent', () => {
      const xml = `<qti-associate-interaction response-identifier="RESPONSE">
        <qti-simple-associable-choice identifier="a">A</qti-simple-associable-choice>
      </qti-associate-interaction>`;
      expect(parse(xml, []).prompt).toBe('');
    });
  });

  describe('prompt and pairs', () => {
    it('reads the prompt HTML', () => {
      expect(parse(ASSOCIATE_XML, [ASSOCIATE_DECL_XML]).prompt).toContain('Match each character');
    });

    it('builds one pair per declared <qti-value>', () => {
      expect(parse(ASSOCIATE_XML, [ASSOCIATE_DECL_XML]).pairs).toHaveLength(2);
    });

    it('resolves pair members to their pool content', () => {
      const state = parse(ASSOCIATE_XML, [ASSOCIATE_DECL_XML]);
      expect(contentsOf(state.pairs)).toEqual([
        ['Antonio', 'Prospero'],
        ['Capulet', 'Montague'],
      ]);
    });

    it('preserves the member order written in the <qti-value>', () => {
      const decl = `<qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="pair">
        <qti-correct-response>
          <qti-value>choice_bbb22222 choice_aaa11111</qti-value>
        </qti-correct-response>
      </qti-response-declaration>`;
      expect(contentsOf(parse(ASSOCIATE_XML, [decl]).pairs)).toEqual([['Prospero', 'Antonio']]);
    });

    it('drops a pair naming an identifier absent from the pool', () => {
      const decl = `<qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="pair">
        <qti-correct-response>
          <qti-value>choice_aaa11111 choice_missing</qti-value>
          <qti-value>choice_ccc33333 choice_ddd44444</qti-value>
        </qti-correct-response>
      </qti-response-declaration>`;
      expect(contentsOf(parse(ASSOCIATE_XML, [decl]).pairs)).toEqual([['Capulet', 'Montague']]);
    });

    it('keeps an empty <qti-value> as a pair of two blank choices', () => {
      const decl = `<qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="pair">
        <qti-correct-response>
          <qti-value></qti-value>
          <qti-value>choice_ccc33333 choice_ddd44444</qti-value>
        </qti-correct-response>
      </qti-response-declaration>`;
      expect(contentsOf(parse(ASSOCIATE_XML, [decl]).pairs)).toEqual([
        ['', ''],
        ['Capulet', 'Montague'],
      ]);
    });

    it('gives the blank pair from an empty <qti-value> generated ids', () => {
      const decl = `<qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="pair">
        <qti-correct-response>
          <qti-value></qti-value>
        </qti-correct-response>
      </qti-response-declaration>`;
      const [[first, second]] = parse(ASSOCIATE_XML, [decl]).pairs;
      expect(first.id).toMatch(/^choice_/);
      expect(second.id).toMatch(/^choice_/);
      expect(first.id).not.toBe(second.id);
    });
  });

  describe('distractors', () => {
    it('treats a choice absent from the correct response as a distractor', () => {
      const state = parse(ASSOCIATE_XML, [ASSOCIATE_DECL_XML]);
      expect(state.distractors.map(choice => choice.content)).toEqual(['Lysander']);
    });

    it('yields one distractor per unused match-max on an unpaired choice', () => {
      const xml = `<qti-associate-interaction response-identifier="RESPONSE">
        <qti-simple-associable-choice identifier="choice_eee55555" match-max="2">Lysander</qti-simple-associable-choice>
      </qti-associate-interaction>`;
      const state = parse(xml, []);
      expect(state.distractors.map(choice => choice.id)).toEqual([
        'choice_eee55555',
        'choice_eee55555',
      ]);
    });

    it('subtracts pair appearances from match-max when counting distractors', () => {
      const xml = `<qti-associate-interaction response-identifier="RESPONSE">
        <qti-simple-associable-choice identifier="choice_aaa11111" match-max="2">Antonio</qti-simple-associable-choice>
        <qti-simple-associable-choice identifier="choice_bbb22222" match-max="1">Prospero</qti-simple-associable-choice>
      </qti-associate-interaction>`;
      const decl = `<qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="pair">
        <qti-correct-response>
          <qti-value>choice_aaa11111 choice_bbb22222</qti-value>
        </qti-correct-response>
      </qti-response-declaration>`;
      const state = parse(xml, [decl]);
      expect(state.distractors.map(choice => choice.id)).toEqual(['choice_aaa11111']);
    });

    it('puts every choice in distractors when no declarations are passed', () => {
      const state = parse(ASSOCIATE_XML, []);
      expect(state.pairs).toEqual([]);
      expect(state.distractors.map(choice => choice.content)).toEqual([
        'Antonio',
        'Prospero',
        'Capulet',
        'Montague',
        'Lysander',
      ]);
    });
  });

  describe('identifiers', () => {
    it('assigns a generated choice_ slug to a choice without an identifier', () => {
      const xml = `<qti-associate-interaction response-identifier="RESPONSE">
        <qti-simple-associable-choice>No ID</qti-simple-associable-choice>
      </qti-associate-interaction>`;
      expect(parse(xml, []).distractors[0].id).toMatch(/^choice_/);
    });

    // Identifiers are used as lookup keys, so one that names an inherited Object
    // member must not resolve to that member.
    it('resolves a choice whose identifier is an Object.prototype member name', () => {
      const xml = `<qti-associate-interaction response-identifier="RESPONSE">
        <qti-simple-associable-choice identifier="constructor" match-max="2">Antonio</qti-simple-associable-choice>
        <qti-simple-associable-choice identifier="choice_bbb22222" match-max="1">Prospero</qti-simple-associable-choice>
      </qti-associate-interaction>`;
      const decl = `<qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="pair">
        <qti-correct-response>
          <qti-value>constructor choice_bbb22222</qti-value>
        </qti-correct-response>
      </qti-response-declaration>`;
      const state = parse(xml, [decl]);
      expect(contentsOf(state.pairs)).toEqual([['Antonio', 'Prospero']]);
      expect(state.distractors.map(choice => choice.id)).toEqual(['constructor']);
    });
  });
});

describe('buildXML()', () => {
  const baseState = {
    responseIdentifier: 'RESPONSE',
    prompt: '<p>Match each character to his adversary.</p>',
    pairs: [
      [
        { id: 'choice_aaa11111', content: 'Antonio' },
        { id: 'choice_bbb22222', content: 'Prospero' },
      ],
      [
        { id: 'choice_ccc33333', content: 'Capulet' },
        { id: 'choice_ddd44444', content: 'Montague' },
      ],
    ],
    distractors: [{ id: 'choice_eee55555', content: 'Lysander' }],
  };

  const build = state => buildXML(state, QuestionType.ASSOCIATE, SCHEMA);
  const choicesOf = root => [...root.querySelectorAll('qti-simple-associable-choice')];
  const valuesOf = decl => [...decl.querySelectorAll('qti-value')].map(n => n.textContent.trim());

  describe('interaction attributes', () => {
    it('sets max-associations to the number of pairs', () => {
      const root = parseXmlString(build(baseState).bodyXml);
      expect(root.getAttribute('max-associations')).toBe('2');
    });

    it('always emits shuffle="true"', () => {
      const root = parseXmlString(build(baseState).bodyXml);
      expect(root.getAttribute('shuffle')).toBe('true');
    });

    it('emits the response identifier from state', () => {
      const root = parseXmlString(build(baseState).bodyXml);
      expect(root.getAttribute('response-identifier')).toBe('RESPONSE');
    });

    it('omits <qti-prompt> when prompt is empty', () => {
      const root = parseXmlString(build({ ...baseState, prompt: '' }).bodyXml);
      expect(root.querySelector('qti-prompt')).toBeNull();
    });
  });

  describe('choice pool', () => {
    it('merges pairs and distractors into one pool of distinct choices', () => {
      const root = parseXmlString(build(baseState).bodyXml);
      expect(choicesOf(root).map(el => el.getAttribute('identifier'))).toEqual([
        'choice_aaa11111',
        'choice_bbb22222',
        'choice_ccc33333',
        'choice_ddd44444',
        'choice_eee55555',
      ]);
    });

    it('gives every singly-used choice match-max="1"', () => {
      const root = parseXmlString(build(baseState).bodyXml);
      expect(choicesOf(root).map(el => el.getAttribute('match-max'))).toEqual([
        '1',
        '1',
        '1',
        '1',
        '1',
      ]);
    });

    it('emits content once for a choice reused across two pairs, with match-max="2"', () => {
      const pairs = [
        baseState.pairs[0],
        [
          { id: 'choice_ccc33333', content: 'Capulet' },
          { id: 'choice_aaa11111', content: 'Antonio' },
        ],
      ];
      const { bodyXml, responseDeclarations } = build({ ...baseState, pairs });
      const antonio = choicesOf(parseXmlString(bodyXml)).filter(el => el.textContent === 'Antonio');
      expect(antonio).toHaveLength(1);
      expect(antonio[0].getAttribute('match-max')).toBe('2');
      expect(valuesOf(parseXmlString(responseDeclarations[0]))).toEqual([
        'choice_aaa11111 choice_bbb22222',
        'choice_ccc33333 choice_aaa11111',
      ]);
    });

    it('counts a distractor repeat of paired content towards match-max', () => {
      const distractors = [{ id: 'choice_zzz00000', content: 'Antonio' }];
      const root = parseXmlString(build({ ...baseState, distractors }).bodyXml);
      const antonio = choicesOf(root).filter(el => el.textContent === 'Antonio');
      expect(antonio).toHaveLength(1);
      expect(antonio[0].getAttribute('match-max')).toBe('2');
    });

    it('reassigns the id of a later choice that reuses an id with different content', () => {
      const pairs = [
        baseState.pairs[0],
        [
          { id: 'choice_aaa11111', content: 'Capulet' },
          { id: 'choice_ddd44444', content: 'Montague' },
        ],
      ];
      const { bodyXml, responseDeclarations } = build({
        ...baseState,
        pairs,
        distractors: [],
      });
      const [capulet] = choicesOf(parseXmlString(bodyXml)).filter(
        el => el.textContent === 'Capulet',
      );
      expect(capulet.getAttribute('identifier')).toMatch(/^choice_/);
      expect(capulet.getAttribute('identifier')).not.toBe('choice_aaa11111');
      expect(valuesOf(parseXmlString(responseDeclarations[0]))[1]).toBe(
        `${capulet.getAttribute('identifier')} choice_ddd44444`,
      );
    });

    // Every permutation of the two normalization rules — one id per content,
    // one content per id — resolved in favour of the first appearance.
    describe('id normalization', () => {
      const idsOf = root => choicesOf(root).map(el => el.getAttribute('identifier'));
      const idOf = (root, content) =>
        choicesOf(root)
          .find(el => el.textContent === content)
          .getAttribute('identifier');

      it('keeps the id of the first appearance when a repeat carries a different id', () => {
        const pairs = [
          baseState.pairs[0],
          [
            { id: 'choice_ccc33333', content: 'Capulet' },
            { id: 'choice_zzz00000', content: 'Antonio' },
          ],
        ];
        const { bodyXml, responseDeclarations } = build({ ...baseState, pairs, distractors: [] });
        const root = parseXmlString(bodyXml);
        expect(idsOf(root)).not.toContain('choice_zzz00000');
        expect(idOf(root, 'Antonio')).toBe('choice_aaa11111');
        expect(valuesOf(parseXmlString(responseDeclarations[0]))[1]).toBe(
          'choice_ccc33333 choice_aaa11111',
        );
      });

      it('keeps the id of the first appearance when a later choice reuses it', () => {
        const pairs = [
          baseState.pairs[0],
          [
            { id: 'choice_aaa11111', content: 'Capulet' },
            { id: 'choice_ddd44444', content: 'Montague' },
          ],
        ];
        const root = parseXmlString(build({ ...baseState, pairs, distractors: [] }).bodyXml);
        expect(idOf(root, 'Antonio')).toBe('choice_aaa11111');
      });

      it('resolves a repeat and then an id conflict on the same choice', () => {
        const pairs = [
          baseState.pairs[0],
          [
            { id: 'choice_aaa11111', content: 'Antonio' },
            { id: 'choice_ccc33333', content: 'Capulet' },
          ],
          [
            { id: 'choice_aaa11111', content: 'Montague' },
            { id: 'choice_ddd44444', content: 'Demetrius' },
          ],
        ];
        const { bodyXml, responseDeclarations } = build({ ...baseState, pairs, distractors: [] });
        const root = parseXmlString(bodyXml);

        expect(idOf(root, 'Antonio')).toBe('choice_aaa11111');
        expect(
          choicesOf(root)
            .find(el => el.textContent === 'Antonio')
            .getAttribute('match-max'),
        ).toBe('2');

        const montagueId = idOf(root, 'Montague');
        expect(montagueId).toMatch(/^choice_/);
        expect(montagueId).not.toBe('choice_aaa11111');
        expect(valuesOf(parseXmlString(responseDeclarations[0]))).toEqual([
          'choice_aaa11111 choice_bbb22222',
          'choice_aaa11111 choice_ccc33333',
          `${montagueId} choice_ddd44444`,
        ]);
      });

      it('gives a third choice repeating reassigned content the reassigned id', () => {
        const pairs = [
          baseState.pairs[0],
          [
            { id: 'choice_aaa11111', content: 'Montague' },
            { id: 'choice_ccc33333', content: 'Capulet' },
          ],
          [
            { id: 'choice_ddd44444', content: 'Montague' },
            { id: 'choice_eee55555', content: 'Lysander' },
          ],
        ];
        const root = parseXmlString(build({ ...baseState, pairs, distractors: [] }).bodyXml);
        const montague = choicesOf(root).filter(el => el.textContent === 'Montague');
        expect(montague).toHaveLength(1);
        expect(montague[0].getAttribute('match-max')).toBe('2');
        expect(idsOf(root)).not.toContain('choice_ddd44444');
      });
    });

    it('keeps two blank choices in a pair as two separate elements', () => {
      const pairs = [
        [
          { id: 'choice_blank111', content: '' },
          { id: 'choice_blank222', content: '' },
        ],
      ];
      const root = parseXmlString(build({ ...baseState, pairs, distractors: [] }).bodyXml);
      expect(choicesOf(root)).toHaveLength(2);
    });
  });

  describe('response declaration', () => {
    it('emits one space-separated <qti-value> per pair, preserving order', () => {
      const decl = parseXmlString(build(baseState).responseDeclarations[0]);
      expect(valuesOf(decl)).toEqual([
        'choice_aaa11111 choice_bbb22222',
        'choice_ccc33333 choice_ddd44444',
      ]);
    });

    it('sets cardinality="multiple"', () => {
      const decl = parseXmlString(build(baseState).responseDeclarations[0]);
      expect(decl.getAttribute('cardinality')).toBe('multiple');
    });

    it('sets base-type="pair"', () => {
      const decl = parseXmlString(build(baseState).responseDeclarations[0]);
      expect(decl.getAttribute('base-type')).toBe('pair');
    });

    it('omits <qti-correct-response> when there are no pairs', () => {
      const { bodyXml, responseDeclarations } = build({ ...baseState, pairs: [] });
      expect(
        parseXmlString(responseDeclarations[0]).querySelector('qti-correct-response'),
      ).toBeNull();
      expect(parseXmlString(bodyXml).getAttribute('max-associations')).toBe('0');
    });
  });
});

describe('parse → buildXML → parse round-trip', () => {
  const roundTrip = state => {
    const { bodyXml, responseDeclarations } = buildXML(state, QuestionType.ASSOCIATE, SCHEMA);
    return parse(bodyXml, responseDeclarations);
  };

  it('preserves pair contents and ids for a full associate XML', () => {
    const original = parse(ASSOCIATE_XML, [ASSOCIATE_DECL_XML]);
    const reparsed = roundTrip(original);
    expect(contentsOf(reparsed.pairs)).toEqual(contentsOf(original.pairs));
    expect(reparsed.pairs.map(pair => pair.map(choice => choice.id))).toEqual(
      original.pairs.map(pair => pair.map(choice => choice.id)),
    );
  });

  it('preserves distractor contents for a full associate XML', () => {
    const original = parse(ASSOCIATE_XML, [ASSOCIATE_DECL_XML]);
    const reparsed = roundTrip(original);
    expect(reparsed.distractors.map(choice => choice.content).sort()).toEqual(
      original.distractors.map(choice => choice.content).sort(),
    );
  });

  it('preserves a pair declared as an empty <qti-value>', () => {
    const decl = `<qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="pair">
      <qti-correct-response>
        <qti-value></qti-value>
        <qti-value>choice_ccc33333 choice_ddd44444</qti-value>
      </qti-correct-response>
    </qti-response-declaration>`;
    const reparsed = roundTrip(parse(ASSOCIATE_XML, [decl]));
    expect(contentsOf(reparsed.pairs)).toEqual([
      ['', ''],
      ['Capulet', 'Montague'],
    ]);
  });

  it('preserves the default state as one pair of two blank choices', () => {
    const reparsed = roundTrip(parse('', []));
    expect(contentsOf(reparsed.pairs)).toEqual([['', '']]);
    expect(reparsed.distractors).toEqual([]);
  });
});
