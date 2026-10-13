// jest-dom's matchers reject the XML nodes this serialization produces.
/* eslint-disable jest-dom/prefer-to-have-attribute, jest-dom/prefer-to-have-text-content */
import { assembleItemXml } from '../assembleItem';
import { parseItem } from '../parseItem';
import { parseXML } from '../xml';
import { textEntryInteractionDescriptor as descriptor } from '../../interactions/textEntry/Descriptor';
import { QuestionType } from '../../constants';

const answer = (value, caseSensitive = false) => ({
  id: `answer_${value}`,
  value,
  caseSensitive,
});

const assemble = ({ bodyXml, responseDeclarations }) =>
  assembleItemXml({
    identifier: 'item_1',
    title: 'Question',
    language: 'en',
    bodyXml,
    responseDeclarations,
  });

const build = (questionType, answers) =>
  assemble(descriptor.buildXML({ prompt: '<p>Q</p>', answers, expectedLength: 50 }, questionType));

const read = xml => {
  const [{ bodyXml, responseDeclarations }] = parseItem(xml).interactions;
  return descriptor.parse(bodyXml, responseDeclarations);
};

const template = xml =>
  parseXML(xml).querySelector('qti-response-processing').getAttribute('template');

const summarize = ({ answers }) =>
  answers.map(({ value, caseSensitive }) => [value, caseSensitive]);

describe('a text entry item', () => {
  describe('response processing', () => {
    it.each([
      [QuestionType.NUMERIC, [answer('1')]],
      [QuestionType.TEXT_ENTRY, [answer('a')]],
      [QuestionType.NUMERIC, [answer('1'), answer('2'), answer('3')]],
      [QuestionType.TEXT_ENTRY, [answer('a'), answer('b'), answer('c')]],
    ])('%s with %j is scored by map_response', (questionType, answers) => {
      expect(template(build(questionType, answers))).toContain('rptemplates/map_response');
    });

    it.each([QuestionType.NUMERIC, QuestionType.TEXT_ENTRY])(
      'declares %s as single cardinality however many answers it has',
      questionType => {
        const doc = parseXML(build(questionType, [answer('1'), answer('2')]));
        expect(doc.querySelector('qti-response-declaration').getAttribute('cardinality')).toBe(
          'single',
        );
      },
    );
  });

  it.each([
    [QuestionType.NUMERIC, [answer('1')]],
    [QuestionType.TEXT_ENTRY, [answer('a'), answer('b')]],
  ])('scores %s answers %j 1 each and anything else 0', (questionType, answers) => {
    const doc = parseXML(build(questionType, answers));
    expect(doc.querySelector('qti-mapping').getAttribute('default-value')).toBe('0');
    const entries = [...doc.querySelectorAll('qti-map-entry')];
    expect(entries.map(e => e.getAttribute('mapped-value'))).toEqual(answers.map(() => '1'));
  });

  describe('round trip', () => {
    it.each([
      [QuestionType.NUMERIC, [answer('1')]],
      [QuestionType.NUMERIC, [answer('1'), answer('2'), answer('3')]],
      [QuestionType.NUMERIC, [answer('2'), answer('2'), answer('2.0')]],
      [QuestionType.TEXT_ENTRY, [answer('a')]],
      [QuestionType.TEXT_ENTRY, [answer('a', true)]],
      [QuestionType.TEXT_ENTRY, [answer('a', true), answer('b'), answer('c', true)]],
    ])('%s keeps answers %j in order with their flags', (questionType, answers) => {
      const once = read(build(questionType, answers));
      const twice = read(build(questionType, once.answers));
      expect(summarize(once)).toEqual(summarize({ answers }));
      expect(summarize(twice)).toEqual(summarize(once));
    });
  });

  it.each([
    [QuestionType.NUMERIC, [answer('1'), answer('2'), answer('3')]],
    [QuestionType.TEXT_ENTRY, [answer('a'), answer('b'), answer('c')]],
  ])('holds only the first %s answer in the correct response', (questionType, answers) => {
    const doc = parseXML(build(questionType, answers));
    const values = [...doc.querySelectorAll('qti-correct-response qti-value')];
    expect(values.map(v => v.textContent)).toEqual([answers[0].value]);
  });

  it('keeps Numeric answers as authored', () => {
    const doc = parseXML(build(QuestionType.NUMERIC, [answer('1.0'), answer('.5'), answer('1e3')]));
    const entries = [...doc.querySelectorAll('qti-map-entry')];
    expect(entries.map(e => e.getAttribute('map-key'))).toEqual(['1.0', '.5', '1e3']);
    expect(doc.querySelector('qti-correct-response qti-value').textContent).toBe('1.0');
  });

  it('writes Text answers and map keys trimmed', () => {
    const doc = parseXML(build(QuestionType.TEXT_ENTRY, [answer(' New York '), answer('Rome  ')]));
    expect(doc.querySelector('qti-correct-response qti-value').textContent).toBe('New York');
    const entries = [...doc.querySelectorAll('qti-map-entry')];
    expect(entries.map(e => e.getAttribute('map-key'))).toEqual(['New York', 'Rome']);
  });

  it('writes the Numeric answer and map key trimmed', () => {
    const doc = parseXML(build(QuestionType.NUMERIC, [answer(' 5 ')]));
    expect(doc.querySelector('qti-correct-response qti-value').textContent).toBe('5');
    expect(doc.querySelector('qti-map-entry').getAttribute('map-key')).toBe('5');
  });

  it('never marks a Numeric map entry case-sensitive', () => {
    const doc = parseXML(build(QuestionType.NUMERIC, [answer('1', true)]));
    expect(doc.querySelector('qti-map-entry').hasAttribute('case-sensitive')).toBe(false);
  });

  it('keeps invalid and repeated Numeric answers as authored', () => {
    const xml = build(QuestionType.NUMERIC, [
      answer('2'),
      answer('1e'),
      answer('0x10'),
      answer('2.0'),
    ]);
    const entries = [...parseXML(xml).querySelectorAll('qti-map-entry')];
    expect(entries.map(e => e.getAttribute('map-key'))).toEqual(['2', '1e', '0x10', '2.0']);
  });

  const item = declaration =>
    '<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="i" title="T" xml:lang="en">' +
    declaration +
    '<qti-item-body><p>Q</p><p><qti-text-entry-interaction response-identifier="RESPONSE"/></p></qti-item-body>' +
    '</qti-assessment-item>';

  describe('saved with cardinality="multiple"', () => {
    const NUMERIC = item(
      '<qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="float">' +
        '<qti-correct-response><qti-value>1</qti-value><qti-value>2</qti-value><qti-value>3</qti-value></qti-correct-response>' +
        '</qti-response-declaration>',
    );
    const TEXT = item(
      '<qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="string">' +
        '<qti-correct-response><qti-value>a</qti-value><qti-value>b</qti-value><qti-value>c</qti-value></qti-correct-response>' +
        '<qti-mapping default-value="0">' +
        '<qti-map-entry map-key="a" mapped-value="1" case-sensitive="true"/>' +
        '<qti-map-entry map-key="b" mapped-value="1"/>' +
        '<qti-map-entry map-key="c" mapped-value="1"/>' +
        '</qti-mapping></qti-response-declaration>',
    );

    it('opens a Numeric item with every accepted answer', () => {
      expect(summarize(read(NUMERIC))).toEqual([
        ['1', false],
        ['2', false],
        ['3', false],
      ]);
    });

    it('opens a Text item with every accepted answer and its case flag', () => {
      expect(summarize(read(TEXT))).toEqual([
        ['a', true],
        ['b', false],
        ['c', false],
      ]);
    });

    it.each([
      [QuestionType.NUMERIC, NUMERIC],
      [QuestionType.TEXT_ENTRY, TEXT],
    ])('rewrites a %s item as single cardinality scored by map_response', (questionType, xml) => {
      const rewritten = assemble(
        descriptor.buildXML({ ...read(xml), expectedLength: 50 }, questionType),
      );
      const doc = parseXML(rewritten);
      expect(doc.querySelector('qti-response-declaration').getAttribute('cardinality')).toBe(
        'single',
      );
      expect(doc.querySelectorAll('qti-map-entry')).toHaveLength(3);
      expect(template(rewritten)).toContain('rptemplates/map_response');
    });
  });

  it('opens a Text item without a mapping as case-sensitive and rewrites it with one', () => {
    const TEXT_WITHOUT_MAPPING = item(
      '<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string">' +
        '<qti-correct-response><qti-value>a</qti-value></qti-correct-response>' +
        '</qti-response-declaration>',
    );
    const state = read(TEXT_WITHOUT_MAPPING);
    expect(summarize(state)).toEqual([['a', true]]);
    const rewritten = assemble(
      descriptor.buildXML({ ...state, expectedLength: 50 }, QuestionType.TEXT_ENTRY),
    );
    expect(template(rewritten)).toContain('rptemplates/map_response');
    const entries = [...parseXML(rewritten).querySelectorAll('qti-map-entry')];
    expect(entries.map(e => e.getAttribute('case-sensitive'))).toEqual(['true']);
  });
});
