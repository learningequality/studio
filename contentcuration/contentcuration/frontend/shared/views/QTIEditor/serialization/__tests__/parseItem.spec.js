import { parseXML, parseItem } from '../parseItem';
import { VALID_CHOICE_ITEM_DOCUMENT, TWO_INTERACTIONS_DOCUMENT } from '../../utils/testingFixtures';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ITEM_NO_INTERACTIONS = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
  xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
  identifier="item-empty"
  title="Empty"
  adaptive="false"
  time-dependent="false"
  xml:lang="en"
>
  <qti-item-body></qti-item-body>
</qti-assessment-item>`;

// ---------------------------------------------------------------------------
// parseXML
// ---------------------------------------------------------------------------

describe('parseXML', () => {
  it('parses valid XML into a Document', () => {
    const doc = parseXML(VALID_CHOICE_ITEM_DOCUMENT);
    expect(doc).toBeInstanceOf(Document);
    expect(doc.querySelector('qti-assessment-item')).not.toBeNull();
  });

  it('throws for malformed XML', () => {
    expect(() => parseXML('<unclosed')).toThrow(/QTI XML parse error/i);
  });

  it('throws for XML with a parsererror node', () => {
    // An extra closing tag causes a parsererror in jsdom
    expect(() => parseXML('<root></root></extra>')).toThrow(/QTI XML parse error/i);
  });
});

// ---------------------------------------------------------------------------
// parseItem — meta extraction
// ---------------------------------------------------------------------------

describe('parseItem — meta', () => {
  it('returns an object with the top-level item attributes', () => {
    const model = parseItem(VALID_CHOICE_ITEM_DOCUMENT);
    expect(model.identifier).toBe('item-test-1');
    expect(model.title).toBe('Test Question');
    expect(model.language).toBe('en');
  });

  it('returns empty strings for missing meta attributes', () => {
    const xml =
      '<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"><qti-item-body /></qti-assessment-item>';
    const model = parseItem(xml);
    expect(model.identifier).toBe('');
    expect(model.title).toBe('');
    expect(model.language).toBe('');
  });
});

// ---------------------------------------------------------------------------
// parseItem — interaction blocks
// ---------------------------------------------------------------------------

describe('parseItem — interaction blocks', () => {
  it('extracts interactions and their corresponding response declarations', () => {
    const model = parseItem(VALID_CHOICE_ITEM_DOCUMENT);
    expect(model.interactions).toHaveLength(1);

    const block = model.interactions[0];
    expect(block.bodyXml).toContain('<qti-choice-interaction');
    expect(block.responseDeclarations).toHaveLength(1);
    expect(block.responseDeclarations[0]).toContain('identifier="RESPONSE"');
  });

  it('returns two blocks for an item with two interactions', () => {
    const model = parseItem(TWO_INTERACTIONS_DOCUMENT);
    expect(model.interactions).toHaveLength(2);
  });

  it('returns empty interactions array for an item with no interactions', () => {
    const model = parseItem(ITEM_NO_INTERACTIONS);
    expect(model.interactions).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// parseItem — response declaration matching
// ---------------------------------------------------------------------------

describe('parseItem — response declaration matching', () => {
  it('matches each interaction to its own response declaration', () => {
    const model = parseItem(TWO_INTERACTIONS_DOCUMENT);
    expect(model.interactions[0].responseDeclarations[0]).toContain('identifier="RESP1"');
    expect(model.interactions[1].responseDeclarations[0]).toContain('identifier="RESP2"');
  });

  it('returns empty responseDeclarations when no declaration matches', () => {
    // interaction references RESP-MISSING which has no declaration
    const xml = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="x" title="" adaptive="false" time-dependent="false" xml:lang="en">
      <qti-item-body>
        <qti-choice-interaction response-identifier="RESP-MISSING" max-choices="1">
          <qti-simple-choice identifier="a">A</qti-simple-choice>
        </qti-choice-interaction>
      </qti-item-body>
    </qti-assessment-item>`;
    const model = parseItem(xml);
    expect(model.interactions[0].responseDeclarations).toHaveLength(0);
  });
});
