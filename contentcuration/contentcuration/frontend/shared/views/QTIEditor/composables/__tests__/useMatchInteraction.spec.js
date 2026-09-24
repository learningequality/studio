import { ref } from 'vue';
import { useMatchInteraction } from '../useMatchInteraction';
import { MATCH_XML, MATCH_DECL_XML } from '../../utils/testingFixtures';
import { parseXML } from '../../serialization/xml';
import { QuestionType } from '../../constants';

const GENERATED_CHOICE_ID = /^choice_[a-z0-9]{8}$/;
const GENERATED_ROW_ID = /^row_[a-z0-9]{8}$/;

const contentsOf = rows =>
  rows.map(row => [row.content, row.matches.map(choice => choice.content)]);

const maxAssociations = bodyXml =>
  parseXML(bodyXml).documentElement.getAttribute('max-associations');

describe('useMatchInteraction', () => {
  function setup(bodyXml = MATCH_XML, declarationXml = MATCH_DECL_XML) {
    const questionType = ref(QuestionType.MATCH);
    return useMatchInteraction({ bodyXml, responseDeclarations: [declarationXml] }, questionType);
  }

  describe('addRow()', () => {
    it('appends a row with a blank prompt and one blank answer', () => {
      const { state, addRow } = setup();
      addRow();
      expect(state.value.rows).toHaveLength(4);
      const row = state.value.rows[3];
      expect(row.content).toBe('');
      expect(row.id).toMatch(GENERATED_ROW_ID);
      expect(row.matches).toHaveLength(1);
      expect(row.matches[0].content).toBe('');
      expect(row.matches[0].id).toMatch(GENERATED_CHOICE_ID);
    });

    it('rebuilds bodyXml with the new max-associations', () => {
      const { bodyXml, addRow } = setup();
      addRow();
      expect(maxAssociations(bodyXml.value)).toBe('4');
    });
  });

  describe('removeRow()', () => {
    it('drops the row at the given index and keeps the rest in order', () => {
      const { state, removeRow } = setup();
      removeRow(1);
      expect(contentsOf(state.value.rows)).toEqual([
        ['Dog', ['Mammal']],
        ['Frog', ['Amphibian']],
      ]);
    });

    it('is a no-op when only one row remains', () => {
      const { state, removeRow } = setup();
      removeRow(0);
      removeRow(0);
      removeRow(0);
      expect(contentsOf(state.value.rows)).toEqual([['Frog', ['Amphibian']]]);
    });

    it("drops the row's values from the emitted correct response", () => {
      const { responseDeclarations, removeRow } = setup();
      removeRow(0);
      expect(responseDeclarations.value[0]).not.toContain('row_dog');
    });
  });

  describe('setRowContent()', () => {
    it('updates only the targeted row prompt', () => {
      const { state, setRowContent } = setup();
      setRowContent(1, '<p>Hawk</p>');
      expect(contentsOf(state.value.rows)).toEqual([
        ['Dog', ['Mammal']],
        ['<p>Hawk</p>', ['Bird']],
        ['Frog', ['Amphibian']],
      ]);
    });
  });

  describe('addMatch()', () => {
    it('appends a blank answer with a generated id to that row only', () => {
      const { state, addMatch } = setup();
      addMatch(0);
      expect(contentsOf(state.value.rows)).toEqual([
        ['Dog', ['Mammal', '']],
        ['Eagle', ['Bird']],
        ['Frog', ['Amphibian']],
      ]);
      expect(state.value.rows[0].matches[1].id).toMatch(GENERATED_CHOICE_ID);
    });

    it('appends the given content when the answer is written before it is added', () => {
      const { state, addMatch } = setup();
      addMatch(2, '<p>Vertebrate</p>');
      expect(state.value.rows[2].matches.map(c => c.content)).toEqual([
        'Amphibian',
        '<p>Vertebrate</p>',
      ]);
      expect(state.value.rows[2].matches[1].id).toMatch(GENERATED_CHOICE_ID);
    });

    it('leaves a previously captured state untouched', () => {
      const { state, addMatch } = setup();
      const before = state.value;
      addMatch(0, '<p>Vertebrate</p>');
      expect(contentsOf(before.rows)).toEqual([
        ['Dog', ['Mammal']],
        ['Eagle', ['Bird']],
        ['Frog', ['Amphibian']],
      ]);
    });
  });

  describe('removeMatch()', () => {
    it('drops only the targeted answer', () => {
      const { state, addMatch, removeMatch } = setup();
      addMatch(0, '<p>Vertebrate</p>');
      addMatch(1, '<p>Vertebrate</p>');
      removeMatch(0, 0);
      expect(contentsOf(state.value.rows)).toEqual([
        ['Dog', ['<p>Vertebrate</p>']],
        ['Eagle', ['Bird', '<p>Vertebrate</p>']],
        ['Frog', ['Amphibian']],
      ]);
    });

    it('keeps the identity of the answers after the removed one', () => {
      const { state, addMatch, removeMatch } = setup();
      addMatch(0, '<p>Vertebrate</p>');
      const second = state.value.rows[0].matches[1];
      removeMatch(0, 0);
      expect(state.value.rows[0].matches[0]).toBe(second);
    });

    it("is a no-op on a row's only answer", () => {
      const { state, removeMatch } = setup();
      removeMatch(0, 0);
      expect(contentsOf(state.value.rows)[0]).toEqual(['Dog', ['Mammal']]);
    });
  });

  describe('setMatchContent()', () => {
    it('updates only the targeted answer', () => {
      const { state, addMatch, setMatchContent } = setup();
      addMatch(0, '<p>Vertebrate</p>');
      setMatchContent(0, 1, '<p>Canine</p>');
      expect(contentsOf(state.value.rows)).toEqual([
        ['Dog', ['Mammal', '<p>Canine</p>']],
        ['Eagle', ['Bird']],
        ['Frog', ['Amphibian']],
      ]);
    });
  });

  describe('addDistractor()', () => {
    it('appends one blank choice with a generated id', () => {
      const { state, addDistractor } = setup();
      addDistractor();
      expect(state.value.distractors).toHaveLength(2);
      expect(state.value.distractors[1].content).toBe('');
      expect(state.value.distractors[1].id).toMatch(GENERATED_CHOICE_ID);
    });

    it('appends the given content when the distractor is written before it is added', () => {
      const { state, addDistractor } = setup();
      addDistractor('<p>Fish</p>');
      expect(state.value.distractors[1].content).toBe('<p>Fish</p>');
      expect(state.value.distractors[1].id).toMatch(GENERATED_CHOICE_ID);
    });
  });

  describe('removeDistractor()', () => {
    it('drops the distractor at the given index', () => {
      const { state, removeDistractor } = setup();
      removeDistractor(0);
      expect(state.value.distractors).toEqual([]);
    });
  });

  describe('setDistractorContent()', () => {
    it('updates only the targeted distractor', () => {
      const { state, addDistractor, setDistractorContent } = setup();
      addDistractor();
      setDistractorContent(1, '<p>Updated</p>');
      expect(state.value.distractors.map(d => d.content)).toEqual(['Reptile', '<p>Updated</p>']);
    });
  });
});
