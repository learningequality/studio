import { parseXML, getPromptHTML } from '../xml';
import { VALID_CHOICE_ITEM_DOCUMENT } from '../../utils/testingFixtures';

// parseXML
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

  it('parses valid XML when text/xml is passed explicitly', () => {
    const doc = parseXML(VALID_CHOICE_ITEM_DOCUMENT, 'text/xml');
    expect(doc.querySelector('qti-assessment-item')).not.toBeNull();
  });

  it('parses HTML leniently into a Document when text/html is passed', () => {
    const doc = parseXML('<b>bold</b>', 'text/html');
    expect(doc).toBeInstanceOf(Document);
    // doc.body is a DOMParser-realm node, not a testing-library node, so
    // toHaveTextContent rejects it; assert on textContent directly.
    // eslint-disable-next-line jest-dom/prefer-to-have-text-content
    expect(doc.body.textContent).toBe('bold');
  });

  it('does not throw for malformed HTML', () => {
    expect(() => parseXML('<unclosed', 'text/html')).not.toThrow();
  });

  it('does not treat a literal parsererror element in HTML as a failure', () => {
    expect(() => parseXML('<parsererror>x</parsererror>', 'text/html')).not.toThrow();
  });

  it('leaves the namespace declared on the document element in place', () => {
    const doc = parseXML(
      '<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"/>',
    );
    expect(doc.documentElement.namespaceURI).toBe('http://www.imsglobal.org/xsd/imsqtiasi_v3p0');
  });

  it('leaves a foreign namespace declared on a nested element in place', () => {
    // MathML has to keep its own namespace: without it, serializing the subtree back
    // into a QTI-namespaced item makes <math> inherit the QTI namespace, which the
    // schema rejects.
    const doc = parseXML(
      '<qti-prompt><p>x <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi></math></p></qti-prompt>',
    );
    expect(doc.querySelector('math').namespaceURI).toBe('http://www.w3.org/1998/Math/MathML');
  });

  it('finds an element by local name regardless of the namespace it is in', () => {
    // Which is why nothing needs the declarations removed to look elements up.
    const doc = parseXML(
      '<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"><qti-item-body/></qti-assessment-item>',
    );
    expect(doc.querySelector('qti-item-body')).not.toBeNull();
  });
});

describe('getPromptHTML', () => {
  it('returns the prompt markup of an interaction', () => {
    const el = parseXML(
      '<qti-choice-interaction><qti-prompt>Pick <strong>one</strong></qti-prompt></qti-choice-interaction>',
    ).documentElement;

    expect(getPromptHTML(el)).toBe('Pick <strong>one</strong>');
  });

  it('returns an empty string when the interaction has no prompt', () => {
    const el = parseXML('<qti-choice-interaction />').documentElement;

    expect(getPromptHTML(el)).toBe('');
  });
});
