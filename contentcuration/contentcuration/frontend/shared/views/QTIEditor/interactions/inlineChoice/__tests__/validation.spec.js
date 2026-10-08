import { validateInlineChoiceInteraction } from '../validation';
import { buildXmlNode, serializeAsHtml } from '../../../serialization/xml';
import { ValidationError } from '../../../constants';

/**
 * @param {string} responseId
 * @param {string|null} correct - choice id marked correct
 * @param {Array<{ id: string, text: string }>} options
 */
function dropdown(responseId, correct, options) {
  return buildXmlNode({
    tag: 'qti-inline-choice-interaction',
    attrs: { 'response-identifier': responseId, 'data-studio-correct': correct },
    children: options.map(({ id, text }) =>
      buildXmlNode({ tag: 'qti-inline-choice', attrs: { identifier: id }, children: [text] }),
    ),
  });
}

// The passage is HTML, as parse writes it.
const passage = (...children) => serializeAsHtml([buildXmlNode({ tag: 'p', children })]);

const VALID_STATE = {
  prompt: '<p>Fill the gap.</p>',
  passage: passage(
    'The sky is ',
    dropdown('r1', 'a', [
      { id: 'a', text: 'blue' },
      { id: 'b', text: 'green' },
    ]),
    '.',
  ),
  shuffle: false,
};

const validate = state => validateInlineChoiceInteraction(state);
const withPassage = (...dropdowns) => ({ ...VALID_STATE, passage: passage(...dropdowns) });

describe('validateInlineChoiceInteraction', () => {
  it('returns [] for a valid state', () => {
    expect(validate(VALID_STATE)).toEqual([]);
  });

  it('does not treat an empty prompt as an error', () => {
    expect(validate({ ...VALID_STATE, prompt: '' })).toEqual([]);
  });

  describe('NO_INTERACTION', () => {
    it('is reported without an id when the passage has no dropdown', () => {
      const errors = validate({ ...VALID_STATE, passage: '<p>Just text</p>' });
      expect(errors).toEqual([{ code: ValidationError.NO_INTERACTION }]);
    });
  });

  describe('EMPTY_CHOICE_CONTENT', () => {
    it('flags an empty option by its choice id', () => {
      const errors = validate(
        withPassage(
          dropdown('r1', 'a', [
            { id: 'a', text: 'blue' },
            { id: 'b', text: '' },
          ]),
        ),
      );
      expect(errors).toEqual([{ code: ValidationError.EMPTY_CHOICE_CONTENT, id: 'b' }]);
    });

    it('flags a whitespace-only option', () => {
      const errors = validate(
        withPassage(
          dropdown('r1', 'a', [
            { id: 'a', text: 'blue' },
            { id: 'b', text: '  ' },
          ]),
        ),
      );
      expect(errors).toEqual([{ code: ValidationError.EMPTY_CHOICE_CONTENT, id: 'b' }]);
    });

    it('reports a single empty option with no correct answer as exactly two errors', () => {
      const errors = validate(withPassage(dropdown('r1', null, [{ id: 'a', text: '' }])));
      expect(errors).toEqual([
        { code: ValidationError.EMPTY_CHOICE_CONTENT, id: 'a' },
        { code: ValidationError.NO_CORRECT_ANSWER, id: 'r1' },
      ]);
    });
  });

  describe('DUPLICATE_CHOICE_CONTENT', () => {
    it('flags both members of a duplicate pair', () => {
      const errors = validate(
        withPassage(
          dropdown('r1', 'a', [
            { id: 'a', text: 'blue' },
            { id: 'b', text: ' blue ' },
          ]),
        ),
      );
      const ids = errors.filter(e => e.code === ValidationError.DUPLICATE_CHOICE_CONTENT);
      expect(ids.map(e => e.id).sort()).toEqual(['a', 'b']);
    });

    it('flags every member of a three-way group', () => {
      const errors = validate(
        withPassage(
          dropdown('r1', 'a', [
            { id: 'a', text: 'x' },
            { id: 'b', text: 'x' },
            { id: 'c', text: 'x' },
          ]),
        ),
      );
      const ids = errors.filter(e => e.code === ValidationError.DUPLICATE_CHOICE_CONTENT);
      expect(ids.map(e => e.id).sort()).toEqual(['a', 'b', 'c']);
    });

    it('does not compare across dropdowns', () => {
      const errors = validate(
        withPassage(
          dropdown('r1', 'a', [
            { id: 'a', text: 'blue' },
            { id: 'b', text: 'red' },
          ]),
          dropdown('r2', 'c', [
            { id: 'c', text: 'blue' },
            { id: 'd', text: 'green' },
          ]),
        ),
      );
      expect(errors).toEqual([]);
    });

    it('is case-sensitive', () => {
      const errors = validate(
        withPassage(
          dropdown('r1', 'a', [
            { id: 'a', text: 'Blue' },
            { id: 'b', text: 'blue' },
          ]),
        ),
      );
      expect(errors).toEqual([]);
    });

    it('does not also report empty options as duplicates', () => {
      const errors = validate(
        withPassage(
          dropdown('r1', 'a', [
            { id: 'a', text: 'blue' },
            { id: 'b', text: '' },
            { id: 'c', text: '' },
          ]),
        ),
      );
      expect(errors.some(e => e.code === ValidationError.DUPLICATE_CHOICE_CONTENT)).toBe(false);
    });
  });

  describe('NO_CORRECT_ANSWER', () => {
    it('carries the dropdown response id, not an option id', () => {
      const errors = validate(
        withPassage(
          dropdown('r1', null, [
            { id: 'a', text: 'blue' },
            { id: 'b', text: 'red' },
          ]),
        ),
      );
      expect(errors).toEqual([{ code: ValidationError.NO_CORRECT_ANSWER, id: 'r1' }]);
    });

    it('is reported per dropdown', () => {
      const errors = validate(
        withPassage(
          dropdown('r1', 'a', [{ id: 'a', text: 'blue' }]),
          dropdown('r2', null, [{ id: 'c', text: 'red' }]),
        ),
      );
      expect(errors).toEqual([{ code: ValidationError.NO_CORRECT_ANSWER, id: 'r2' }]);
    });
  });
});
