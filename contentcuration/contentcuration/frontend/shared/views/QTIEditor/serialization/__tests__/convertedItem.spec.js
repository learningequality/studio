/**
 * The editor's read/write pair against what the converter actually emits.
 *
 * These read the converter's own fixtures rather than a copy, because the bug this file
 * exists to catch was a disagreement between the two: `testingFixtures.js` is hand-written
 * and carries no grading declarations, so nothing noticed that a converted item loses its
 * scoring rules on the first save.
 */
// Disabled because jest-dom's matchers are built for HTML elements and reject the strict
// XML nodes this serialization produces — same reason as assembleItem.spec.js.
/* eslint-disable jest-dom/prefer-to-have-attribute */
import fs from 'fs';
import path from 'path';
import { parseItem } from '../parseItem';
import { assembleItemXml } from '../assembleItem';

const FIXTURES = path.join(__dirname, '../../../../../../tests/utils/qti/fixtures');

const read = name => fs.readFileSync(path.join(FIXTURES, `${name}.xml`), 'utf8');

const rebuild = item =>
  assembleItemXml({
    identifier: item.identifier,
    title: item.title,
    language: item.language,
    bodyXml: item.interactions[0].bodyXml,
    responseDeclarations: item.interactions[0].responseDeclarations,
    hints: item.hints,
  });

describe('a converted single-selection item', () => {
  const original = read('single_selection');

  it('is read with the language the converter wrote', () => {
    expect(parseItem(original).language).toBe('en-US');
  });

  it('writes the language back as xml:lang, the attribute QTI declares', () => {
    const xml = rebuild(parseItem(original));
    expect(xml).toContain('xml:lang="en-US"');
    expect(xml).not.toContain(' language="');
  });

  it('keeps its scoring outcome and response processing', () => {
    const xml = rebuild(parseItem(original));
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.querySelector('qti-outcome-declaration').getAttribute('identifier')).toBe('SCORE');
    expect(doc.querySelector('qti-response-processing').getAttribute('template')).toBe(
      'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct',
    );
  });

  it('puts the children in the order the schema fixes', () => {
    const xml = rebuild(parseItem(original));
    const order = [...xml.matchAll(/<(qti-[a-z-]+)/g)]
      .map(m => m[1])
      .filter(tag =>
        [
          'qti-response-declaration',
          'qti-outcome-declaration',
          'qti-item-body',
          'qti-response-processing',
        ].includes(tag),
      );
    expect(order).toEqual([
      'qti-response-declaration',
      'qti-outcome-declaration',
      'qti-item-body',
      'qti-response-processing',
    ]);
  });
});

describe('an item this editor wrote', () => {
  it('keeps xml:lang, the spelling this editor uses', () => {
    const xml = assembleItemXml({
      identifier: 'i',
      title: 't',
      language: 'es',
      bodyXml: '<qti-choice-interaction response-identifier="RESPONSE"/>',
      responseDeclarations: ['<qti-response-declaration identifier="RESPONSE"/>'],
    });
    expect(xml).toContain('xml:lang="es"');
  });

  it('omits the language rather than inventing one', () => {
    const xml = assembleItemXml({
      identifier: 'i',
      title: 't',
      language: '',
      bodyXml: '<qti-choice-interaction response-identifier="RESPONSE"/>',
      responseDeclarations: [],
    });
    expect(xml).not.toContain('xml:lang');
    expect(xml).not.toContain('language=');
  });

  it('scores nothing when there is nothing to answer', () => {
    const xml = assembleItemXml({
      identifier: 'i',
      title: 't',
      language: 'en',
      bodyXml: '<qti-item-body><p>Just text.</p></qti-item-body>',
      responseDeclarations: [],
    });
    expect(xml).toContain('qti-outcome-declaration');
    expect(xml).not.toContain('qti-response-processing');
  });
});
