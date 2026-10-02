/* eslint-disable jest-dom/prefer-to-have-attribute, jest-dom/prefer-to-have-text-content */
import { assembleItemXml } from '../../../serialization/assembleItem';
import { buildXmlNode, parseXML, serializeAsHtml } from '../../../serialization/xml';
import { BaseType, Cardinality, QuestionType } from '../../../constants';
import {
  _defaultState,
  buildInlineChoiceInteractionXML,
  getDropdowns,
  parseInlineChoiceInteraction,
} from '../parse';

const serializer = new XMLSerializer();

function declaration(responseId, correct) {
  const correctXml =
    correct === undefined
      ? ''
      : `<qti-correct-response><qti-value>${correct}</qti-value></qti-correct-response>`;
  return `<qti-response-declaration identifier="${responseId}" cardinality="single" base-type="identifier">${correctXml}</qti-response-declaration>`;
}

/**
 * @param {string|undefined} responseId - left out of the element when undefined
 * @param {Array<{ id?: string, text: string }>} options
 * @param {object} [attrs] - further dropdown attributes
 */
function dropdown(responseId, options, attrs = {}) {
  return buildXmlNode({
    tag: 'qti-inline-choice-interaction',
    attrs: { 'response-identifier': responseId, ...attrs },
    children: options.map(({ id, text }) =>
      buildXmlNode({ tag: 'qti-inline-choice', attrs: { identifier: id }, children: [text] }),
    ),
  });
}

const p = (...children) => buildXmlNode({ tag: 'p', children });
const question = (text, attrs = {}) =>
  buildXmlNode({ tag: 'p', attrs: { 'data-studio-prompt': '', ...attrs }, children: [text] });
const body = (...children) =>
  serializer.serializeToString(buildXmlNode({ tag: 'qti-item-body', children }));
// State strings are HTML, as parse writes them.
const html = (...nodes) => serializeAsHtml(nodes);

// Response id and correct id of each dropdown in a state's passage.
const answers = state =>
  getDropdowns(state.passage).map(({ responseIdentifier, correctId }) => ({
    responseIdentifier,
    correctId,
  }));

const SENTINEL = `<p><qti-inline-choice-interaction response-identifier="studio_sentinel" data-studio-sentinel=""><qti-inline-choice identifier="studio_sentinel"></qti-inline-choice></qti-inline-choice-interaction></p>`;
const SENTINEL_BODY = question => `<qti-item-body>${question}${SENTINEL}</qti-item-body>`;

describe('getDropdowns', () => {
  it('reads every dropdown in document order, including nested ones', () => {
    const passage = html(
      p(buildXmlNode({ tag: 'strong', children: [dropdown('r1', [{ id: 'c1', text: 'a' }])] })),
      buildXmlNode({
        tag: 'ul',
        children: [
          buildXmlNode({ tag: 'li', children: [dropdown('r2', [{ id: 'c2', text: 'b' }])] }),
        ],
      }),
      buildXmlNode({
        tag: 'div',
        children: [
          buildXmlNode({ tag: 'div', children: [dropdown('r3', [{ id: 'c3', text: 'c' }])] }),
        ],
      }),
    );
    expect(getDropdowns(passage).map(d => d.responseIdentifier)).toEqual(['r1', 'r2', 'r3']);
  });

  it('keeps every option when an option is empty', () => {
    const passage = `<p><qti-inline-choice-interaction response-identifier="r1"><qti-inline-choice identifier="c1"></qti-inline-choice><qti-inline-choice identifier="c2">B</qti-inline-choice></qti-inline-choice-interaction></p>`;
    expect(getDropdowns(passage)[0].options).toEqual([
      { id: 'c1', text: '' },
      { id: 'c2', text: 'B' },
    ]);
  });

  it('returns option text untrimmed', () => {
    const passage = html(dropdown('r1', [{ id: 'c1', text: '  a  ' }]));
    expect(getDropdowns(passage)[0].options[0].text).toBe('  a  ');
  });

  it('returns the correct id when it names one of its own options', () => {
    const passage = html(
      dropdown('r1', [{ id: 'c1', text: 'a' }], { 'data-studio-correct': 'c1' }),
    );
    expect(getDropdowns(passage)[0].correctId).toBe('c1');
  });

  it('returns null when no correct attribute is present', () => {
    expect(getDropdowns(html(dropdown('r1', [{ id: 'c1', text: 'a' }])))[0].correctId).toBeNull();
  });

  it('returns null when the correct attribute names a sibling dropdown option', () => {
    const passage = html(
      dropdown('r1', [{ id: 'c1', text: 'a' }], { 'data-studio-correct': 'c2' }),
      dropdown('r2', [{ id: 'c2', text: 'b' }]),
    );
    expect(getDropdowns(passage)[0].correctId).toBeNull();
  });

  it('returns no dropdowns for a passage without any', () => {
    expect(getDropdowns('<p>x</p>')).toEqual([]);
  });
});

describe('parseInlineChoiceInteraction', () => {
  it('returns the default state for an empty or unparseable body', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(parseInlineChoiceInteraction('', [])).toEqual(_defaultState());
    expect(parseInlineChoiceInteraction('<qti-item-body>', [])).toEqual(_defaultState());
    spy.mockRestore();
  });

  describe('question and passage', () => {
    it('splits marked top-level elements into the question across several paragraphs', () => {
      const xml = body(
        question('Q1'),
        question('Q2'),
        p('Pass ', dropdown('r1', [{ id: 'c1', text: 'a' }])),
      );
      const state = parseInlineChoiceInteraction(xml, [declaration('r1', 'c1')]);
      expect(state.prompt).toBe('<p>Q1</p><p>Q2</p>');
      expect(state.passage).not.toContain('Q1');
      expect(state.passage).not.toContain('data-studio-prompt');
    });

    it('keeps the other attributes of a question element, such as its alignment', () => {
      const xml = body(
        question('Q', { style: 'text-align: center;', dir: 'rtl' }),
        p(dropdown('r1', [{ id: 'c1', text: 'a' }])),
      );
      expect(parseInlineChoiceInteraction(xml, []).prompt).toBe(
        '<p style="text-align: center;" dir="rtl">Q</p>',
      );
    });

    it('treats an item with no markers as all passage', () => {
      const xml = body(p('Pass ', dropdown('r1', [{ id: 'c1', text: 'a' }])));
      const state = parseInlineChoiceInteraction(xml, []);
      expect(state.prompt).toBe('');
      expect(state.passage).toContain('Pass');
    });

    it('keeps bare text beside a dropdown in the passage', () => {
      const state = parseInlineChoiceInteraction(
        body('Hello ', dropdown('r1', [{ id: 'c1', text: 'a' }]), ' world'),
        [],
      );
      expect(state.passage).toContain('Hello');
      expect(state.passage).toContain('world');
      expect(state.passage).toContain('qti-inline-choice-interaction');
    });

    it('drops a dropdown from the question, keeping its text', () => {
      const xml = body(
        buildXmlNode({
          tag: 'p',
          attrs: { 'data-studio-prompt': '' },
          children: ['Pick ', dropdown('r1', [{ id: 'c1', text: 'a' }]), ' one'],
        }),
        p(dropdown('r2', [{ id: 'c2', text: 'b' }])),
      );
      const state = parseInlineChoiceInteraction(xml, [declaration('r1', 'c1')]);
      expect(state.prompt).toBe('<p>Pick  one</p>');
      expect(answers(state)).toEqual([{ responseIdentifier: 'r2', correctId: null }]);
    });

    it('drops a dropdown that is itself a marked question element', () => {
      const xml = body(
        dropdown('r1', [{ id: 'c1', text: 'a' }], { 'data-studio-prompt': '' }),
        p(dropdown('r2', [{ id: 'c2', text: 'b' }])),
      );
      const state = parseInlineChoiceInteraction(xml, []);
      expect(state.prompt).toBe('');
      expect(answers(state).map(d => d.responseIdentifier)).toEqual(['r2']);
    });
  });

  describe('sentinel', () => {
    it('drops the sentinel and its paragraph, keeping the question', () => {
      const state = parseInlineChoiceInteraction(
        SENTINEL_BODY('<p data-studio-prompt="">Q</p>'),
        [],
      );
      expect(state).toEqual({ prompt: '<p>Q</p>', passage: '', shuffle: false });
    });

    it('keeps an empty question empty when the passage has no dropdown', () => {
      const state = parseInlineChoiceInteraction(SENTINEL_BODY('<p>Only passage</p>'), []);
      expect(state.prompt).toBe('');
      expect(state.passage).toBe('<p>Only passage</p>');
    });

    it('drops a bare sentinel that has no paragraph', () => {
      const xml =
        '<qti-item-body><qti-inline-choice-interaction response-identifier="studio_sentinel" data-studio-sentinel=""><qti-inline-choice identifier="studio_sentinel"></qti-inline-choice></qti-inline-choice-interaction></qti-item-body>';
      expect(parseInlineChoiceInteraction(xml, []).passage).toBe('');
    });
  });

  describe('correct answers', () => {
    it('marks the correct choice from the matching declaration', () => {
      const xml = body(
        p(
          dropdown('r1', [
            { id: 'c1', text: 'a' },
            { id: 'c2', text: 'b' },
          ]),
          dropdown('r2', [{ id: 'c3', text: 'c' }]),
        ),
      );
      const state = parseInlineChoiceInteraction(xml, [
        declaration('r1', 'c2'),
        declaration('r2', 'c3'),
      ]);
      expect(answers(state)).toEqual([
        { responseIdentifier: 'r1', correctId: 'c2' },
        { responseIdentifier: 'r2', correctId: 'c3' },
      ]);
    });

    it('gives correctId null when there is no correct response', () => {
      const xml = body(p(dropdown('r1', [{ id: 'c1', text: 'a' }])));
      const state = parseInlineChoiceInteraction(xml, [declaration('r1')]);
      expect(answers(state)).toEqual([{ responseIdentifier: 'r1', correctId: null }]);
    });

    it("ignores a declared value naming another dropdown's option", () => {
      const xml = body(
        p(dropdown('r1', [{ id: 'c1', text: 'a' }]), dropdown('r2', [{ id: 'c2', text: 'b' }])),
      );
      const state = parseInlineChoiceInteraction(xml, [declaration('r1', 'c2')]);
      expect(answers(state)).toEqual([
        { responseIdentifier: 'r1', correctId: null },
        { responseIdentifier: 'r2', correctId: null },
      ]);
    });

    it('makes the correct answer follow a renamed shared choice id', () => {
      const xml = body(
        p(
          dropdown('r1', [{ id: 'same', text: 'a' }]),
          dropdown('r2', [
            { id: 'same', text: 'b' },
            { id: 'other', text: 'c' },
          ]),
        ),
      );
      const { passage } = parseInlineChoiceInteraction(xml, [
        declaration('r1', 'same'),
        declaration('r2', 'same'),
      ]);
      const [first, second] = getDropdowns(passage);
      expect(first.options[0].id).toBe('same');
      expect(first.correctId).toBe('same');
      expect(second.options[0].id).not.toBe('same');
      expect(second.correctId).toBe(second.options[0].id);
    });
  });

  describe('shuffle', () => {
    it('is on when any dropdown has shuffle="true"', () => {
      const xml = body(
        p(
          dropdown('r1', [{ id: 'c1', text: 'a' }], { shuffle: 'false' }),
          dropdown('r2', [{ id: 'c2', text: 'b' }], { shuffle: 'true' }),
          dropdown('r3', [{ id: 'c3', text: 'c' }], { shuffle: 'false' }),
        ),
      );
      expect(parseInlineChoiceInteraction(xml, []).shuffle).toBe(true);
    });

    it('is off when no dropdown shuffles', () => {
      const xml = body(p(dropdown('r1', [{ id: 'c1', text: 'a' }], { shuffle: 'false' })));
      expect(parseInlineChoiceInteraction(xml, []).shuffle).toBe(false);
    });
  });

  describe('dropdown normalization', () => {
    it('strips every dropdown attribute except response-identifier and data-studio-correct', () => {
      const xml = body(
        p(
          dropdown('r1', [{ id: 'c1', text: 'a' }], {
            shuffle: 'true',
            class: 'x',
            required: 'true',
          }),
        ),
      );
      const { passage } = parseInlineChoiceInteraction(xml, [declaration('r1', 'c1')]);
      const el = parseXML(passage, 'text/html').querySelector('qti-inline-choice-interaction');
      expect(el.getAttributeNames().sort()).toEqual(['data-studio-correct', 'response-identifier']);
    });

    it('flattens option markup to text', () => {
      const option = buildXmlNode({
        tag: 'qti-inline-choice',
        attrs: { identifier: 'c1' },
        children: [buildXmlNode({ tag: 'b', children: ['x'] }), 'y'],
      });
      const xml = body(
        p(
          buildXmlNode({
            tag: 'qti-inline-choice-interaction',
            attrs: { 'response-identifier': 'r1' },
            children: [option],
          }),
        ),
      );
      const { passage } = parseInlineChoiceInteraction(xml, []);
      expect(getDropdowns(passage)[0].options[0].text).toBe('xy');
      expect(passage).not.toContain('<b>');
    });

    it('generates missing response and choice identifiers', () => {
      const xml = body(p(dropdown(undefined, [{ text: 'a' }, { text: 'b' }])));
      const [d] = getDropdowns(parseInlineChoiceInteraction(xml, []).passage);
      expect(d.responseIdentifier).toMatch(/^response_/);
      expect(d.options.map(o => o.id)).toEqual([
        expect.stringMatching(/^choice_/),
        expect.stringMatching(/^choice_/),
      ]);
      expect(d.options[0].id).not.toBe(d.options[1].id);
    });

    it('renames a repeated response identifier and gives it no correct answer', () => {
      const xml = body(
        p(dropdown('r1', [{ id: 'c1', text: 'a' }]), dropdown('r1', [{ id: 'c2', text: 'b' }])),
      );
      const [first, second] = getDropdowns(
        parseInlineChoiceInteraction(xml, [declaration('r1', 'c1')]).passage,
      );
      expect(first.responseIdentifier).toBe('r1');
      expect(first.correctId).toBe('c1');
      expect(second.responseIdentifier).not.toBe('r1');
      expect(second.correctId).toBeNull();
    });

    it('finds dropdowns nested in formatting and lists', () => {
      const xml = body(
        p(buildXmlNode({ tag: 'strong', children: [dropdown('r1', [{ id: 'c1', text: 'a' }])] })),
        buildXmlNode({
          tag: 'ul',
          children: [
            buildXmlNode({ tag: 'li', children: [dropdown('r2', [{ id: 'c2', text: 'b' }])] }),
          ],
        }),
      );
      const state = parseInlineChoiceInteraction(xml, [declaration('r2', 'c2')]);
      expect(answers(state)).toEqual([
        { responseIdentifier: 'r1', correctId: null },
        { responseIdentifier: 'r2', correctId: 'c2' },
      ]);
    });
  });

  it('serializes as HTML: no self-closing tags and no xmlns', () => {
    const xml = `<qti-item-body xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"><p data-studio-prompt="">Q<br/></p><p>x <qti-inline-choice-interaction response-identifier="r1"><qti-inline-choice identifier="c1"/><qti-inline-choice identifier="c2">B</qti-inline-choice></qti-inline-choice-interaction></p></qti-item-body>`;
    const { prompt, passage } = parseInlineChoiceInteraction(xml, []);
    for (const s of [prompt, passage]) {
      expect(s).not.toContain('/>');
      expect(s).not.toContain('xmlns');
    }
    expect(getDropdowns(passage)[0].options.map(o => o.id)).toEqual(['c1', 'c2']);
  });
});

describe('buildInlineChoiceInteractionXML', () => {
  const schema = { baseType: BaseType.IDENTIFIER, cardinality: Cardinality.SINGLE };
  const marked = (id, correct, options = [{ id: 'c1', text: 'a' }]) =>
    dropdown(id, options, { 'data-studio-correct': correct });

  function build(state) {
    return buildInlineChoiceInteractionXML(state, QuestionType.INLINE_CHOICE, schema);
  }

  function bodyDoc(state) {
    return parseXML(build(state).bodyXml);
  }

  function declarations(state) {
    return build(state).responseDeclarations.map(xml => parseXML(xml).documentElement);
  }

  function declarationIds(state) {
    return declarations(state).map(el => el.getAttribute('identifier'));
  }

  // The path a saved item takes: assemble, then read the body and declarations back.
  function roundTrip(state) {
    const built = build(state);
    const item = parseXML(assembleItemXml({ ...built, identifier: 'i', title: 't', language: '' }));
    return parseInlineChoiceInteraction(
      serializer.serializeToString(item.querySelector('qti-item-body')),
      [...item.querySelectorAll('qti-response-declaration')].map(el =>
        serializer.serializeToString(el),
      ),
    );
  }

  const state = {
    prompt: '<p>Pick</p><p>Carefully</p>',
    passage: html(
      p(
        'A ',
        marked('r1', 'c2', [
          { id: 'c1', text: 'x' },
          { id: 'c2', text: 'y' },
        ]),
        ' and ',
        marked('r2', 'c3', [{ id: 'c3', text: 'z' }]),
      ),
    ),
    shuffle: true,
  };

  describe('round trip', () => {
    it('returns the state it was built from', () => {
      expect(roundTrip(state)).toEqual(state);
    });

    it('keeps a dropdown with a single empty option', () => {
      const empty = {
        prompt: '<p>Pick</p>',
        passage: html(p('A ', marked('r1', null, [{ id: 'c1', text: '' }]))),
        shuffle: false,
      };
      expect(roundTrip(empty)).toEqual(empty);
    });

    it('keeps a rubric block in the prompt directly under the item body', () => {
      const rubric =
        '<qti-rubric-block view="scorer" use="instructions"><qti-content-body><p>r</p></qti-content-body></qti-rubric-block>';
      const rubricState = {
        prompt: rubric,
        passage: html(p('A ', marked('r1', 'c1'))),
        shuffle: false,
      };
      const doc = bodyDoc(rubricState);
      expect(doc.documentElement.firstElementChild.localName).toBe('qti-rubric-block');
      expect(roundTrip(rubricState).prompt).toBe(rubric);
    });
  });

  describe('question', () => {
    it('marks every top-level question element, and only those', () => {
      const marks = [...bodyDoc(state).documentElement.children].map(el =>
        el.hasAttribute('data-studio-prompt'),
      );
      expect(marks).toEqual([true, true, false]);
    });

    it('wraps bare top-level question text so it reloads as question', () => {
      const back = roundTrip({ ...state, prompt: 'bare prompt' });
      expect(back.prompt).toBe('<div>bare prompt</div>');
      expect(back.passage).toBe(state.passage);
    });

    it('wraps a run of bare text and inline elements in one block', () => {
      const back = roundTrip({ ...state, prompt: 'Some <strong>bold</strong> text<p>next</p>' });
      expect(back.prompt).toBe('<div>Some <strong>bold</strong> text</div><p>next</p>');
    });

    it('wraps a top-level image in the question, stable across rebuilds', () => {
      const prompt = '<p>Look:</p><img src="x.png" alt="a">';
      const once = roundTrip({ ...state, prompt });
      expect(once.prompt).toBe('<p>Look:</p><div><img src="x.png" alt="a"></div>');
      expect(roundTrip(once).prompt).toBe(once.prompt);
    });

    it('wraps top-level images and small text in the passage', () => {
      const passage = html(p('A ', marked('r1', null, [{ id: 'c1', text: 'a' }])));
      const doc = bodyDoc({
        ...state,
        passage: `${passage}<img src="x.png" alt="a"><small class="small-text">s</small>`,
      });
      const tops = [...doc.documentElement.children].map(el => el.localName);
      expect(tops).not.toContain('img');
      expect(tops).not.toContain('small');
      expect(doc.querySelector('img').parentElement.localName).toBe('div');
      expect(doc.querySelector('small').parentElement.localName).toBe('div');
    });

    it('adds no paragraph for whitespace between question blocks', () => {
      const back = roundTrip({ ...state, prompt: '<p>a</p>\n<p>b</p>' });
      expect(back.prompt).toBe('<p>a</p><p>b</p>');
    });

    it('writes no stray element for an empty question', () => {
      const doc = bodyDoc({ ...state, prompt: '' });
      expect(doc.querySelectorAll('[data-studio-prompt]')).toHaveLength(0);
    });

    it('drops a dropdown from the question, and writes no declaration for it', () => {
      const withQuestionDropdown = {
        ...state,
        prompt: html(p('Pick ', marked('rq', 'cq', [{ id: 'cq', text: 'q' }]))),
      };
      const doc = bodyDoc(withQuestionDropdown);
      expect(doc.querySelector('[data-studio-prompt]').textContent).toBe('Pick ');
      expect(doc.querySelectorAll('qti-inline-choice-interaction')).toHaveLength(2);
      expect(declarationIds(withQuestionDropdown)).toEqual(['r1', 'r2']);
    });
  });

  describe('dropdowns', () => {
    it('writes no data-studio-correct and shuffle on every dropdown', () => {
      const dropdowns = [...bodyDoc(state).querySelectorAll('qti-inline-choice-interaction')];
      expect(dropdowns).toHaveLength(2);
      for (const el of dropdowns) {
        expect(el.hasAttribute('data-studio-correct')).toBe(false);
        expect(el.getAttribute('shuffle')).toBe('true');
      }
    });

    it('writes shuffle="false" when the state is unshuffled', () => {
      const doc = bodyDoc({ ...state, shuffle: false });
      expect(doc.querySelector('qti-inline-choice-interaction').getAttribute('shuffle')).toBe(
        'false',
      );
    });

    it('renames a repeated response identifier, writing one declaration each', () => {
      // A copy of a dropdown pasted into the passage repeats its response and choice ids.
      const copied = () => marked('r1', 'c1', [{ id: 'c1', text: 'x' }]);
      const repeated = { prompt: '', passage: html(p(copied(), ' ', copied())), shuffle: false };
      const dropdowns = [...bodyDoc(repeated).querySelectorAll('qti-inline-choice-interaction')];
      const responseIds = dropdowns.map(el => el.getAttribute('response-identifier'));
      expect(responseIds[0]).toBe('r1');
      expect(responseIds[1]).not.toBe('r1');
      expect(declarationIds(repeated)).toEqual(responseIds);
    });

    it('renames a repeated choice identifier, and the correct answer follows it', () => {
      const repeated = {
        prompt: '',
        passage: html(
          p(
            marked('r1', 'c1', [{ id: 'c1', text: 'x' }]),
            marked('r2', 'c1', [
              { id: 'c2', text: 'y' },
              { id: 'c1', text: 'z' },
            ]),
          ),
        ),
        shuffle: false,
      };
      const second = bodyDoc(repeated).querySelectorAll('qti-inline-choice-interaction')[1];
      const renamed = second.querySelectorAll('qti-inline-choice')[1].getAttribute('identifier');
      expect(renamed).not.toBe('c1');
      expect(declarations(repeated)[1].querySelector('qti-value').textContent).toBe(renamed);
    });

    it('renames repeated ids the same way on every build', () => {
      const copied = () => marked('r1', 'c1', [{ id: 'c1', text: 'x' }]);
      const repeated = { prompt: '', passage: html(p(copied(), copied())), shuffle: false };
      expect(build(repeated)).toEqual(build(repeated));
    });

    it('renames to an id no other dropdown or option uses', () => {
      const repeated = {
        prompt: '',
        passage: html(
          p(
            marked('r1', 'c1', [{ id: 'c1', text: 'x' }]),
            marked('r1_2', 'c2', [{ id: 'c2', text: 'y' }]),
            marked('r1', 'c3', [{ id: 'c3', text: 'z' }]),
          ),
        ),
        shuffle: false,
      };
      expect(new Set(declarationIds(repeated)).size).toBe(3);
    });
  });

  describe('declarations', () => {
    it('writes one per dropdown, in passage order with ids unchanged', () => {
      const reordered = {
        prompt: '',
        passage: html(p(marked('rb', 'c1'), marked('ra', 'c5', [{ id: 'c5', text: 'b' }]))),
        shuffle: false,
      };
      expect(declarationIds(reordered)).toEqual(['rb', 'ra']);
      expect(declarationIds({ ...reordered, passage: html(p(marked('ra', 'c1'))) })).toEqual([
        'ra',
      ]);
    });

    it('declares each dropdown as a single identifier with its correct value', () => {
      const [first, second] = declarations(state);
      expect(first.getAttribute('cardinality')).toBe('single');
      expect(first.getAttribute('base-type')).toBe('identifier');
      expect(first.querySelector('qti-correct-response qti-value').textContent).toBe('c2');
      expect(second.querySelector('qti-correct-response qti-value').textContent).toBe('c3');
      expect(first.querySelector('qti-mapping')).toBeNull();
    });

    it('writes no correct response for a dropdown without one, and reads it back as null', () => {
      const noCorrect = {
        prompt: '',
        passage: html(p(marked('r1', null), marked('r2', 'c1', [{ id: 'c7', text: 'b' }]))),
        shuffle: false,
      };
      const [first, second] = declarations(noCorrect);
      expect(first.querySelector('qti-correct-response')).toBeNull();
      // r2's marker names another dropdown's option, so it is unmarked too.
      expect(second.querySelector('qti-correct-response')).toBeNull();
      expect(answers(roundTrip(noCorrect))).toEqual([
        { responseIdentifier: 'r1', correctId: null },
        { responseIdentifier: 'r2', correctId: null },
      ]);
    });
  });

  describe('sentinel', () => {
    const sentinels = doc => doc.querySelectorAll('[data-studio-sentinel]');

    it('is written once, with no declaration, when the passage has no dropdown', () => {
      const empty = { prompt: '<p>Q</p>', passage: '<p>Text</p>', shuffle: false };
      const built = build(empty);
      const doc = parseXML(built.bodyXml);
      expect(sentinels(doc)).toHaveLength(1);
      expect(sentinels(doc)[0].parentElement.tagName).toBe('p');
      expect(sentinels(doc)[0].querySelectorAll('qti-inline-choice')).toHaveLength(1);
      expect(built.responseDeclarations).toEqual([]);
    });

    it('is not written when a dropdown exists', () => {
      expect(sentinels(bodyDoc(state))).toHaveLength(0);
    });

    it('keeps question and passage through a round trip, with no dropdowns', () => {
      const empty = { prompt: '', passage: '<p>Text</p>', shuffle: false };
      const back = roundTrip(empty);
      expect(back).toEqual(empty);
      expect(getDropdowns(back.passage)).toEqual([]);
    });

    it('is written for a completely empty state', () => {
      expect(sentinels(bodyDoc(_defaultState()))).toHaveLength(1);
    });
  });
});
