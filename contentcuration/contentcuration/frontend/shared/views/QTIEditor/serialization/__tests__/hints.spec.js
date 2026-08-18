// Disabled because jest-dom's matchers are built for HTML elements and misbehave on the
// strict XML nodes this serialization produces - same reason as assembleItem.spec.js.
/* eslint-disable jest-dom/prefer-to-have-attribute */
import { parseItem } from '../parseItem';
import { assembleItemXml } from '../assembleItem';
import { parseHints, hintHasContent, HINT_SUPPORT } from '../hints';
import { parseXML } from '../xml';
import {
  CHOICE_ITEM_DOCUMENT_WITH_HINTS,
  VALID_CHOICE_ITEM_DOCUMENT,
} from '../../utils/testingFixtures';

const hintContents = doc => parseHints(parseXML(doc)).map(h => h.content);

describe('parseHints', () => {
  it('reads every hint card, in document order', () => {
    expect(hintContents(CHOICE_ITEM_DOCUMENT_WITH_HINTS)).toEqual([
      '<p>test</p>',
      '<p>test2 2</p>',
      '<p>test3 3</p>',
    ]);
  });

  it('returns nothing for an item with no catalog', () => {
    expect(hintContents(VALID_CHOICE_ITEM_DOCUMENT)).toEqual([]);
  });

  it('ignores cards that carry some other support value', () => {
    const doc = `<qti-assessment-item><qti-catalog-info><qti-catalog id="other">
      <qti-card support="ext:something-else"><qti-html-content><p>no</p></qti-html-content></qti-card>
      </qti-catalog></qti-catalog-info></qti-assessment-item>`;
    expect(hintContents(doc)).toEqual([]);
  });

  it('reads a hint card that carries no content as empty', () => {
    const doc = `<qti-assessment-item><qti-catalog-info><qti-catalog id="kolibri-hints">
      <qti-card support="${HINT_SUPPORT}"/></qti-catalog></qti-catalog-info></qti-assessment-item>`;
    expect(hintContents(doc)).toEqual(['']);
  });

  it('gives each hint an id so a list can key on it', () => {
    const ids = parseHints(parseXML(CHOICE_ITEM_DOCUMENT_WITH_HINTS)).map(h => h.id);
    expect(new Set(ids).size).toBe(3);
  });
});

describe('hintHasContent', () => {
  it.each([
    ['<p>text</p>', true],
    ['plain text', true],
    ['', false],
    ['   ', false],
    ['<p></p>', false],
    ['<p>&nbsp;</p>', false],
    // A hint can be entirely an image or a formula — from a converted Perseus hint, or
    // from the editor's own image and formula buttons. Reading only the text would drop it.
    ['<p><img src="abc123.png"/></p>', true],
    ['<p><img src="abc123.png" alt=""/></p>', true],
    ['<p><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi></math></p>', true],
    ['<p><svg viewBox="0 0 1 1"></svg></p>', true],
    ['<p>see <img src="abc123.png"/></p>', true],
  ])('%s -> %s', (content, expected) => {
    expect(hintHasContent({ content })).toBe(expected);
  });
});

describe('parseItem', () => {
  it('returns hints beside the interactions rather than inside them', () => {
    const item = parseItem(CHOICE_ITEM_DOCUMENT_WITH_HINTS);
    expect(item.hints.map(h => h.content)).toEqual([
      '<p>test</p>',
      '<p>test2 2</p>',
      '<p>test3 3</p>',
    ]);
    expect(item.interactions[0]).not.toHaveProperty('hints');
  });

  it('returns an empty hint list for an item without any', () => {
    expect(parseItem(VALID_CHOICE_ITEM_DOCUMENT).hints).toEqual([]);
  });
});

describe('assembleItemXml with hints', () => {
  const BASE = {
    identifier: 'item-1',
    title: 'T',
    language: 'en',
    bodyXml: '<qti-choice-interaction response-identifier="RESPONSE" max-choices="1"/>',
    responseDeclarations: [],
  };

  it('writes a catalog of hint cards', () => {
    const xml = assembleItemXml({
      ...BASE,
      hints: [
        { id: 'a', content: '<p>first</p>' },
        { id: 'b', content: '<p>second</p>' },
      ],
    });
    const doc = parseXML(xml);
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.querySelector('qti-catalog').getAttribute('id')).toBe('kolibri-hints');
    const cards = [...doc.querySelectorAll('qti-card')];
    expect(cards.map(c => c.getAttribute('support'))).toEqual([HINT_SUPPORT, HINT_SUPPORT]);
    expect(parseHints(doc).map(h => h.content)).toEqual(['<p>first</p>', '<p>second</p>']);
  });

  it('puts the catalog after the item body, which the schema requires', () => {
    const xml = assembleItemXml({ ...BASE, hints: [{ id: 'a', content: '<p>x</p>' }] });
    expect(xml.indexOf('<qti-item-body')).toBeLessThan(xml.indexOf('<qti-catalog-info'));
  });

  it('writes no catalog when there are no hints', () => {
    expect(assembleItemXml({ ...BASE, hints: [] })).not.toContain('qti-catalog-info');
    expect(assembleItemXml(BASE)).not.toContain('qti-catalog-info');
  });

  it('keeps a hint that is only an image', () => {
    const xml = assembleItemXml({
      ...BASE,
      hints: [{ id: 'a', content: '<p><img src="abc123.png" alt=""/></p>' }],
    });
    expect(parseHints(parseXML(xml)).map(h => h.content)).toEqual([
      '<p><img src="abc123.png" alt=""/></p>',
    ]);
  });

  it('leaves out a hint the author has not written yet', () => {
    const xml = assembleItemXml({
      ...BASE,
      hints: [
        { id: 'a', content: '<p>kept</p>' },
        { id: 'b', content: '' },
      ],
    });
    expect([...parseXML(xml).querySelectorAll('qti-card')]).toHaveLength(1);
  });

  it('writes no catalog at all when every hint is empty', () => {
    const xml = assembleItemXml({ ...BASE, hints: [{ id: 'a', content: '' }] });
    expect(xml).not.toContain('qti-catalog-info');
  });

  it('leaves no xhtml namespace on hint markup', () => {
    const xml = assembleItemXml({ ...BASE, hints: [{ id: 'a', content: '<p>x</p>' }] });
    expect(xml).toContain('<qti-html-content><p>x</p></qti-html-content>');
  });
});

describe('hint round trip', () => {
  it('survives parseItem -> assembleItemXml unchanged', () => {
    const item = parseItem(CHOICE_ITEM_DOCUMENT_WITH_HINTS);
    const xml = assembleItemXml({
      identifier: item.identifier,
      title: item.title,
      language: item.language,
      bodyXml: item.interactions[0].bodyXml,
      responseDeclarations: item.interactions[0].responseDeclarations,
      hints: item.hints,
    });

    expect(parseItem(xml).hints.map(h => h.content)).toEqual([
      '<p>test</p>',
      '<p>test2 2</p>',
      '<p>test3 3</p>',
    ]);
  });

  it('keeps an edited hint', () => {
    const item = parseItem(CHOICE_ITEM_DOCUMENT_WITH_HINTS);
    const hints = item.hints.map((h, i) => (i === 1 ? { ...h, content: '<p>rewritten</p>' } : h));
    const xml = assembleItemXml({
      identifier: item.identifier,
      title: item.title,
      language: item.language,
      bodyXml: item.interactions[0].bodyXml,
      responseDeclarations: item.interactions[0].responseDeclarations,
      hints,
    });

    expect(parseItem(xml).hints.map(h => h.content)).toEqual([
      '<p>test</p>',
      '<p>rewritten</p>',
      '<p>test3 3</p>',
    ]);
  });
});
