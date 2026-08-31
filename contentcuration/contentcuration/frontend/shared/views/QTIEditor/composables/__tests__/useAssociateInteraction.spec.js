import { ref } from 'vue';
import { useAssociateInteraction } from '../useAssociateInteraction';
import { ASSOCIATE_XML, ASSOCIATE_DECL_XML } from '../../utils/testingFixtures';
import { parseXML } from '../../serialization/parseItem';
import { QuestionType } from '../../constants';

const GENERATED_ID = /^choice_[a-zA-Z0-9]{8}$/;

const contentsOf = pairs => pairs.map(pair => pair.map(choice => choice.content));

describe('useAssociateInteraction', () => {
  function setup(bodyXml = ASSOCIATE_XML, declarationXml = ASSOCIATE_DECL_XML) {
    const questionType = ref(QuestionType.ASSOCIATE);
    return useAssociateInteraction(
      { bodyXml, responseDeclarations: [declarationXml] },
      questionType,
    );
  }

  describe('initial state', () => {
    it('parses pairs and distractors from the fixture XML', () => {
      const { state } = setup();
      expect(contentsOf(state.value.pairs)).toEqual([
        ['Antonio', 'Prospero'],
        ['Capulet', 'Montague'],
      ]);
      expect(state.value.distractors.map(d => d.content)).toEqual(['Lysander']);
    });
  });

  describe('addPair()', () => {
    it('appends a pair of two blank choices with distinct generated ids', () => {
      const { state, addPair } = setup();
      addPair();
      expect(contentsOf(state.value.pairs)).toEqual([
        ['Antonio', 'Prospero'],
        ['Capulet', 'Montague'],
        ['', ''],
      ]);
      const [first, second] = state.value.pairs[2];
      expect(first.id).toMatch(GENERATED_ID);
      expect(second.id).toMatch(GENERATED_ID);
      expect(first.id).not.toBe(second.id);
    });
  });

  describe('removePair()', () => {
    it('drops the pair at the given index and keeps the rest in order', () => {
      const { state, removePair } = setup();
      removePair(0);
      expect(contentsOf(state.value.pairs)).toEqual([['Capulet', 'Montague']]);
    });

    it('is a no-op when only one pair remains', () => {
      const { state, removePair } = setup();
      removePair(0);
      removePair(0);
      expect(contentsOf(state.value.pairs)).toEqual([['Capulet', 'Montague']]);
    });

    it('drops the pair from the emitted correct response', () => {
      const { responseDeclarations, removePair } = setup();
      removePair(0);
      expect(responseDeclarations.value[0]).not.toContain('choice_aaa11111');
    });
  });

  describe('setPair()', () => {
    it('replaces only the pair at the given index', () => {
      const { state, setPair } = setup();
      const [first, second] = state.value.pairs[0];
      setPair(0, [{ ...first, content: '<p>Updated</p>' }, second]);
      expect(contentsOf(state.value.pairs)).toEqual([
        ['<p>Updated</p>', 'Prospero'],
        ['Capulet', 'Montague'],
      ]);
    });
  });

  describe('addDistractor()', () => {
    it('appends one blank choice with a generated id', () => {
      const { state, addDistractor } = setup();
      addDistractor();
      expect(state.value.distractors).toHaveLength(2);
      expect(state.value.distractors[1].content).toBe('');
      expect(state.value.distractors[1].id).toMatch(GENERATED_ID);
    });

    it('appends the given content when the distractor is written before it is added', () => {
      const { state, addDistractor } = setup();
      addDistractor('<p>Demetrius</p>');
      expect(state.value.distractors[1].content).toBe('<p>Demetrius</p>');
      expect(state.value.distractors[1].id).toMatch(GENERATED_ID);
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
      expect(state.value.distractors.map(d => d.content)).toEqual(['Lysander', '<p>Updated</p>']);
    });
  });

  describe('max-associations XML output', () => {
    const maxAssociations = bodyXml =>
      parseXML(bodyXml).documentElement.getAttribute('max-associations');

    it('matches the number of pairs in state', () => {
      const { bodyXml } = setup();
      expect(maxAssociations(bodyXml.value)).toBe('2');
    });

    it('follows a pair being added', () => {
      const { bodyXml, addPair } = setup();
      addPair();
      expect(maxAssociations(bodyXml.value)).toBe('3');
    });

    it('follows a pair being removed', () => {
      const { bodyXml, removePair } = setup();
      removePair(0);
      expect(maxAssociations(bodyXml.value)).toBe('1');
    });
  });
});
