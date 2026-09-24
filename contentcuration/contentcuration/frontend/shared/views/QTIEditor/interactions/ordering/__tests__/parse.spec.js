/* eslint-disable jest-dom/prefer-to-have-attribute, jest-dom/prefer-to-have-text-content */
// The eslint-dom matchers reject XML nodes produced by DOMParser(..., 'text/xml').

import { orderingInteractionDescriptor } from '../Descriptor';
import { ORDERING_XML, ORDERING_DECL_XML } from '../../../utils/testingFixtures';
import { QuestionType, Orientation } from '../../../constants';

const parse = orderingInteractionDescriptor.parse.bind(orderingInteractionDescriptor);
const buildXML = orderingInteractionDescriptor.buildXML.bind(orderingInteractionDescriptor);

function parseXmlString(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const err = doc.querySelector('parseerror, parsererror');
  if (err) throw new Error(`Invalid XML: ${err.textContent}`);
  return doc.documentElement;
}

describe('parse()', () => {
  describe('attribute defaults', () => {
    it('returns _defaultState() when bodyXml is empty', () => {
      const state = parse('', []);
      expect(state.items).toHaveLength(1);
    });

    it('returns _defaultState() when bodyXml is invalid XML', () => {
      const state = parse('<not-valid', []);
      expect(state.items).toHaveLength(1);
    });

    it('defaults orientation to "vertical" when attribute is absent', () => {
      const xml = `<qti-order-interaction response-identifier="RESPONSE">
        <qti-simple-choice identifier="a">A</qti-simple-choice>
      </qti-order-interaction>`;
      expect(parse(xml, []).orientation).toBe(Orientation.VERTICAL);
    });

    it('defaults shuffle to false when attribute is absent', () => {
      const xml = `<qti-order-interaction response-identifier="RESPONSE">
        <qti-simple-choice identifier="a">A</qti-simple-choice>
      </qti-order-interaction>`;
      expect(parse(xml, []).shuffle).toBe(false);
    });

    it('defaults prompt to empty string when <qti-prompt> is absent', () => {
      const xml = `<qti-order-interaction response-identifier="RESPONSE">
        <qti-simple-choice identifier="a">A</qti-simple-choice>
      </qti-order-interaction>`;
      expect(parse(xml, []).prompt).toBe('');
    });
  });

  describe('attribute reading', () => {
    it('reads orientation="horizontal"', () => {
      const xml = `<qti-order-interaction response-identifier="RESPONSE" orientation="horizontal">
        <qti-simple-choice identifier="a">A</qti-simple-choice>
      </qti-order-interaction>`;
      expect(parse(xml, []).orientation).toBe('horizontal');
    });

    it('reads shuffle="true"', () => {
      const state = parse(ORDERING_XML, []);
      expect(state.shuffle).toBe(true);
    });

    it('reads the prompt HTML', () => {
      const state = parse(ORDERING_XML, []);
      expect(state.prompt).toContain('Arrange the planets');
    });
  });

  describe('items parsing', () => {
    it('parses items from <qti-simple-choice> elements', () => {
      const state = parse(ORDERING_XML, []);
      expect(state.items).toHaveLength(3);
    });

    it('assigns a generated order_ slug to items without an identifier', () => {
      const xml = `<qti-order-interaction response-identifier="RESPONSE">
        <qti-simple-choice>No ID</qti-simple-choice>
      </qti-order-interaction>`;
      const state = parse(xml, []);
      expect(state.items[0].id).toMatch(/^order_/);
    });

    it('reads the fixed attribute', () => {
      const xml = `<qti-order-interaction response-identifier="RESPONSE">
        <qti-simple-choice identifier="a" fixed="true">A</qti-simple-choice>
      </qti-order-interaction>`;
      expect(parse(xml, []).items[0].fixed).toBe(true);
    });

    it('reorders items to match the correct-response declaration sequence', () => {
      const xml = `<qti-order-interaction response-identifier="RESPONSE">
        <qti-simple-choice identifier="order_aaa11111">Mercury</qti-simple-choice>
        <qti-simple-choice identifier="order_bbb22222">Venus</qti-simple-choice>
        <qti-simple-choice identifier="order_ccc33333">Earth</qti-simple-choice>
      </qti-order-interaction>`;
      const decl = `<qti-response-declaration identifier="RESPONSE" cardinality="ordered" base-type="identifier">
        <qti-correct-response>
          <qti-value>order_ccc33333</qti-value>
          <qti-value>order_aaa11111</qti-value>
          <qti-value>order_bbb22222</qti-value>
        </qti-correct-response>
      </qti-response-declaration>`;
      const state = parse(xml, [decl]);
      expect(state.items.map(i => i.id)).toEqual([
        'order_ccc33333',
        'order_aaa11111',
        'order_bbb22222',
      ]);
    });

    it('does not reorder when no declaration is present', () => {
      const state = parse(ORDERING_XML, []);
      expect(state.items.map(i => i.id)).toEqual([
        'order_aaa11111',
        'order_bbb22222',
        'order_ccc33333',
      ]);
    });
  });
});

describe('buildXML()', () => {
  const baseState = {
    responseIdentifier: 'RESPONSE',
    prompt: 'Order these planets.',
    items: [
      { id: 'order_aaa11111', content: 'Mercury', fixed: false },
      { id: 'order_bbb22222', content: 'Venus', fixed: false },
      { id: 'order_ccc33333', content: 'Earth', fixed: false },
    ],
    orientation: Orientation.VERTICAL,
    shuffle: true,
  };

  it('emits orientation attribute', () => {
    const { bodyXml } = buildXML(baseState, QuestionType.ORDERING);
    const root = parseXmlString(bodyXml);
    expect(root.getAttribute('orientation')).toBe('vertical');
  });

  it('emits shuffle="true"', () => {
    const { bodyXml } = buildXML(baseState, QuestionType.ORDERING);
    const root = parseXmlString(bodyXml);
    expect(root.getAttribute('shuffle')).toBe('true');
  });

  it('emits shuffle="false" when state.shuffle is false', () => {
    const { bodyXml } = buildXML({ ...baseState, shuffle: false }, QuestionType.ORDERING);
    const root = parseXmlString(bodyXml);
    expect(root.getAttribute('shuffle')).toBe('false');
  });

  it('emits <qti-simple-choice> for each item in state.items order', () => {
    const { bodyXml } = buildXML(baseState, QuestionType.ORDERING);
    const root = parseXmlString(bodyXml);
    const choices = root.querySelectorAll('qti-simple-choice');
    expect(choices).toHaveLength(3);
    expect(choices[0].getAttribute('identifier')).toBe('order_aaa11111');
    expect(choices[1].getAttribute('identifier')).toBe('order_bbb22222');
    expect(choices[2].getAttribute('identifier')).toBe('order_ccc33333');
  });

  it('emits identifiers in state.items order inside <qti-correct-response>', () => {
    const { responseDeclarations } = buildXML(baseState, QuestionType.ORDERING);
    const decl = parseXmlString(responseDeclarations[0]);
    const values = [...decl.querySelectorAll('qti-value')].map(n => n.textContent.trim());
    expect(values).toEqual(['order_aaa11111', 'order_bbb22222', 'order_ccc33333']);
  });

  it('sets cardinality="ordered" on the declaration', () => {
    const { responseDeclarations } = buildXML(baseState, QuestionType.ORDERING);
    const decl = parseXmlString(responseDeclarations[0]);
    expect(decl.getAttribute('cardinality')).toBe('ordered');
  });

  it('sets base-type="identifier" on the declaration', () => {
    const { responseDeclarations } = buildXML(baseState, QuestionType.ORDERING);
    const decl = parseXmlString(responseDeclarations[0]);
    expect(decl.getAttribute('base-type')).toBe('identifier');
  });

  it('omits <qti-prompt> when prompt is empty', () => {
    const { bodyXml } = buildXML({ ...baseState, prompt: '' }, QuestionType.ORDERING);
    const root = parseXmlString(bodyXml);
    expect(root.querySelector('qti-prompt')).toBeNull();
  });

  it('omits <qti-correct-response> when items array is empty', () => {
    const { responseDeclarations } = buildXML({ ...baseState, items: [] }, QuestionType.ORDERING);
    const decl = parseXmlString(responseDeclarations[0]);
    expect(decl.querySelector('qti-correct-response')).toBeNull();
  });
});

describe('parse → buildXML → parse round-trip', () => {
  it('re-parsed state matches original for a full ordering XML', () => {
    const original = parse(ORDERING_XML, [ORDERING_DECL_XML]);
    const { bodyXml, responseDeclarations } = buildXML(original, QuestionType.ORDERING);
    const reparsed = parse(bodyXml, responseDeclarations);

    expect(reparsed.orientation).toBe(original.orientation);
    expect(reparsed.shuffle).toBe(original.shuffle);
    expect(reparsed.items.map(i => i.id)).toEqual(original.items.map(i => i.id));
    expect(reparsed.items.map(i => i.content)).toEqual(original.items.map(i => i.content));
  });
});
