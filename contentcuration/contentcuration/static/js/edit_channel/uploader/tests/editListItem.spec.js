import { mount } from '@vue/test-utils';
import { modes } from '../constants';
import EditListItem from './../views/EditListItem.vue';
import { localStore, mockFunctions } from './data.js';
import ContentNodeIcon from 'edit_channel/sharedComponents/ContentNodeIcon.vue';

const ContentNode = {
  id: 'node-1',
  title: 'Node 1',
  kind: 'topic',
  _COMPLETE: true,
};

function makeWrapper(props = {}) {
  let newNode = { title: 'New Node Test', kind: 'topic' }; // No id === new node
  localStore.commit('edit_modal/SET_NODES', [ContentNode, newNode]);
  localStore.commit('edit_modal/SET_NODE', 0);
  return mount(EditListItem, {
    store: localStore,
    attachToDocument: true,
    propsData: {
      index: 0,
      ...props,
    },
  });
}

describe('editListItem', () => {
  let wrapper;
  beforeEach(() => {
    localStore.commit('edit_modal/SET_MODE', modes.EDIT);
    wrapper = makeWrapper();
  });
  describe('on render', () => {
    it('should display icon and title', () => {
      expect(wrapper.text()).toContain(ContentNode.title);
      expect(wrapper.find(ContentNodeIcon).vm.kind).toEqual(ContentNode.kind);
    });
    it('should show asterisk when node is changed', () => {
      expect(wrapper.find('.changed').exists()).toBe(false);
      localStore.commit('edit_modal/UPDATE_NODE', { title: 'New Title' });
      expect(wrapper.vm.node.changesStaged).toBe(true);
    });
    it('should show error icon when node is invalid', () => {
      expect(wrapper.find('.error-icon').exists()).toBe(false);
      localStore.commit('edit_modal/UPDATE_NODE', { title: null });
      localStore.commit('edit_modal/VALIDATE_NODE_DETAILS', { nodeIdx: 0 });
      expect(wrapper.vm.nodeIsValid).toBe(false);
      localStore.commit('edit_modal/UPDATE_NODE', { title: 'Node 1' });
      localStore.commit('edit_modal/VALIDATE_NODE_DETAILS', { nodeIdx: 0 });
    });
    it('should hide error icon when in view only mode', () => {
      localStore.commit('edit_modal/SET_MODE', modes.VIEW_ONLY);
      expect(wrapper.vm.nodeIsValid).toBe(true);
    });
  });
  describe('selection', () => {
    beforeEach(() => {
      localStore.commit('edit_modal/RESET_SELECTED');
    });
    it('checkbox should toggle selection on click', () => {
      localStore.commit('edit_modal/SET_SELECTED', [1]);
      let toggle = wrapper.find('.v-input--selection-controls__input');
      toggle.trigger('click');
      expect(localStore.state.edit_modal.selectedIndices).toContain(0);
      expect(localStore.state.edit_modal.selectedIndices).toContain(1);
      toggle.trigger('click');
      expect(localStore.state.edit_modal.selectedIndices).not.toContain(0);
      expect(localStore.state.edit_modal.selectedIndices).toContain(1);
    });
    it('should set node as only selected node on click', () => {
      localStore.commit('edit_modal/SET_SELECTED', [1]);
      let toggle = wrapper.find('.v-list__tile');
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
