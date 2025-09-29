import { mount } from '@vue/test-utils';
import EditListItem from '../EditListItem';
import { localStore, mockFunctions } from './data.js';

const ContentNode = {
  id: 'node-1',
  title: 'Node 1',
  kind: 'topic',
  _COMPLETE: true,
};

function makeWrapper(props = {}) {
  return mount(EditListItem, {
    store: localStore,
    attachTo: document.body,
    propsData: {
      nodeId: 'node-1',
      ...props,
    },
    computed: {
      getContentNode() {
        return () => ContentNode;
      },
    },
  });
}

describe.skip('editListItem', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  describe('on render', () => {
    it('should show error icon when node is invalid', () => {
      expect(wrapper.find('.error-icon').exists()).toBe(false);
      localStore.commit('edit_modal/UPDATE_NODE', { title: null });
      localStore.commit('edit_modal/VALIDATE_NODE_DETAILS', { nodeIdx: 0 });
      expect(wrapper.vm.nodeIsValid).toBe(false);
      localStore.commit('edit_modal/UPDATE_NODE', { title: 'Node 1' });
      localStore.commit('edit_modal/VALIDATE_NODE_DETAILS', { nodeIdx: 0 });
    });
  });
  describe('selection', () => {
    beforeEach(() => {
      localStore.commit('edit_modal/RESET_SELECTED');
    });
    it('checkbox should toggle selection on click', () => {
      localStore.commit('edit_modal/SET_SELECTED', [1]);
      const toggle = wrapper.find('.v-input--selection-controls__input');
      toggle.trigger('click');
      expect(localStore.state.edit_modal.selectedIndices).toContain(0);
      expect(localStore.state.edit_modal.selectedIndices).toContain(1);
      toggle.trigger('click');
      expect(localStore.state.edit_modal.selectedIndices).not.toContain(0);
      expect(localStore.state.edit_modal.selectedIndices).toContain(1);
    });
    it('should set node as only selected node on click', () => {
      localStore.commit('edit_modal/SET_SELECTED', [1]);
      const toggle = wrapper.find('.v-list__tile');
      toggle.trigger('click');
      expect(localStore.state.edit_modal.selectedIndices).toContain(0);
      expect(localStore.state.edit_modal.selectedIndices).not.toContain(1);
    });
  });
  describe('remove option', () => {
    beforeEach(() => {
      wrapper = makeWrapper({ removable: true });
      mockFunctions.removeNode.mockReset();
    });
    it('should remove the node from the list', () => {
      wrapper.find('.remove-item').trigger('click');
      expect(mockFunctions.removeNode).toHaveBeenCalled();
    });
  });
});
