import { ref } from 'vue';
import { useOrderingInteraction } from '../useOrderingInteraction';
import { ORDERING_XML, ORDERING_DECL_XML } from '../../utils/testingFixtures';
import { QuestionType, ValidationError, Orientation } from '../../constants';

function makeInteractionBlock(bodyXml = ORDERING_XML, declarationXml = ORDERING_DECL_XML) {
  return { bodyXml, responseDeclarations: [declarationXml] };
}

describe('useOrderingInteraction', () => {
  function setup(bodyXml, declarationXml) {
    const questionType = ref(QuestionType.ORDERING);
    return useOrderingInteraction(makeInteractionBlock(bodyXml, declarationXml), questionType);
  }

  describe('initial state', () => {
    it('parses items correctly from the fixture XML', () => {
      const { state } = setup();
      expect(state.value.items).toHaveLength(3);
      expect(state.value.items[0].id).toBe('order_aaa11111');
    });

    it('starts with an empty errors array', () => {
      const { errors } = setup();
      expect(errors.value).toEqual([]);
    });

    it('orientation defaults to vertical', () => {
      const { state } = setup();
      expect(state.value.orientation).toBe(Orientation.VERTICAL);
    });
  });

  describe('addItem()', () => {
    it('appends a new item with a generated order_ identifier', () => {
      const { state, addItem } = setup();
      const before = state.value.items.length;
      addItem();
      expect(state.value.items).toHaveLength(before + 1);
      expect(state.value.items[before].id).toMatch(/^order_/);
    });

    it('new item starts with empty content', () => {
      const { state, addItem } = setup();
      addItem();
      const last = state.value.items[state.value.items.length - 1];
      expect(last.content).toBe('');
    });
  });

  describe('removeItem()', () => {
    it('removes the item with the given id', () => {
      const { state, removeItem } = setup();
      const idToRemove = state.value.items[0].id;
      removeItem(idToRemove);
      expect(state.value.items.find(i => i.id === idToRemove)).toBeUndefined();
    });

    it('is a no-op when only one item remains', () => {
      const { state, removeItem } = setup();
      // Remove until one left
      while (state.value.items.length > 1) {
        removeItem(state.value.items[0].id);
      }
      const lastId = state.value.items[0].id;
      removeItem(lastId);
      expect(state.value.items).toHaveLength(1);
    });
  });

  describe('moveItemUp()', () => {
    it('swaps the item at index N with the one at index N-1', () => {
      const { state, moveItemUp } = setup();
      const [firstId, secondId] = state.value.items.map(i => i.id);
      moveItemUp(secondId);
      expect(state.value.items[0].id).toBe(secondId);
      expect(state.value.items[1].id).toBe(firstId);
    });

    it('is a no-op when the item is already at the top', () => {
      const { state, moveItemUp } = setup();
      const firstId = state.value.items[0].id;
      moveItemUp(firstId);
      expect(state.value.items[0].id).toBe(firstId);
    });
  });

  describe('moveItemDown()', () => {
    it('swaps the item at index N with the one at index N+1', () => {
      const { state, moveItemDown } = setup();
      const [firstId, secondId] = state.value.items.map(i => i.id);
      moveItemDown(firstId);
      expect(state.value.items[0].id).toBe(secondId);
      expect(state.value.items[1].id).toBe(firstId);
    });

    it('is a no-op when the item is already at the bottom', () => {
      const { state, moveItemDown } = setup();
      const lastId = state.value.items[state.value.items.length - 1].id;
      moveItemDown(lastId);
      expect(state.value.items[state.value.items.length - 1].id).toBe(lastId);
    });
  });

  describe('setItemOrder()', () => {
    it('applies the given order', () => {
      const { state, setItemOrder } = setup();
      const [firstId, secondId, thirdId] = state.value.items.map(i => i.id);
      setItemOrder([thirdId, firstId, secondId]);
      expect(state.value.items.map(i => i.id)).toEqual([thirdId, firstId, secondId]);
    });

    it('is a no-op when the given order is not a permutation of the current ids', () => {
      const { state, setItemOrder } = setup();
      const [firstId, secondId, thirdId] = state.value.items.map(i => i.id);

      setItemOrder([thirdId, firstId]);
      expect(state.value.items.map(i => i.id)).toEqual([firstId, secondId, thirdId]);

      setItemOrder([thirdId, firstId, 'order_zzzzzzzz']);
      expect(state.value.items.map(i => i.id)).toEqual([firstId, secondId, thirdId]);
    });

    it('produces the same bodyXml as moveItemUp for the equivalent move', () => {
      const { state, moveItemUp, bodyXml: chevronBodyXml } = setup();
      const [firstId, secondId, thirdId] = state.value.items.map(i => i.id);
      moveItemUp(secondId);

      const { setItemOrder, bodyXml: dragBodyXml } = setup();
      setItemOrder([secondId, firstId, thirdId]);

      expect(dragBodyXml.value).toBe(chevronBodyXml.value);
    });
  });

  describe('setItemContent()', () => {
    it('updates only the targeted item content', () => {
      const { state, setItemContent } = setup();
      const targetId = state.value.items[1].id;
      const untouchedItemContent = state.value.items[0].content;
      setItemContent(targetId, '<p>Updated</p>');
      expect(state.value.items[1].content).toBe('<p>Updated</p>');
      // Other items untouched
      expect(state.value.items[0].content).toBe(untouchedItemContent);
    });
  });

  describe('runValidation()', () => {
    it('populates errors for an invalid state', () => {
      const { runValidation, errors, setPrompt } = setup();
      setPrompt('');
      runValidation();
      expect(errors.value.some(e => e.code === ValidationError.PROMPT_REQUIRED)).toBe(true);
    });
  });
});
