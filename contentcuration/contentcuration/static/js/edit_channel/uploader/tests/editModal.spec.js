import _ from 'underscore';
import Vue from 'vue';
import Vuetify from 'vuetify';
import { mount } from '@vue/test-utils';
import { modes } from '../constants';
import EditModal from './../views/EditModal.vue';
import EditList from './../views/EditList.vue';
import EditView from './../views/EditView.vue';
import { localStore, mockFunctions, generateNode, DEFAULT_TOPIC, DEFAULT_TOPIC2 } from './data.js';
import State from 'edit_channel/state';

Vue.use(Vuetify);

document.body.setAttribute('data-app', true); // Vuetify prints a warning without this

const testNodes = [DEFAULT_TOPIC, DEFAULT_TOPIC2];
State.preferences = {};
State.currentNode = {
  id: 'test-root',
  metadata: {
    max_sort_order: 0,
  },
};

function makeWrapper(props = {}) {
  let wrapper = mount(EditModal, {
    store: localStore,
    attachToDocument: true,
    propsData: props,
  });
  return wrapper;
}

describe('editModal', () => {
  let wrapper;
  beforeEach(() => {
    localStore.commit('edit_modal/SET_NODES', testNodes);
    wrapper = makeWrapper();
    wrapper.vm.dialog = true;
    mockFunctions.copyNodes.mockReset();
    mockFunctions.saveNodes.mockReset();
  });
  describe('on render', () => {
    it('should show correct header', () => {
      _.each(_.values(modes), mode => {
        localStore.commit('edit_modal/SET_MODE', mode);
        expect(wrapper.find('.v-toolbar__title').text()).toContain(wrapper.vm.$tr(mode));
        expect(wrapper.find({ ref: 'savebutton' }).exists()).toBe(mode !== modes.VIEW_ONLY);
        expect(wrapper.find({ ref: 'copybutton' }).exists()).toBe(mode === modes.VIEW_ONLY);
      });
    });
    it('should have EditList and EditView components', () => {
      expect(wrapper.find(EditView).exists()).toBe(true);
      expect(wrapper.find(EditList).exists()).toBe(true);
    });
  });
  describe('navigation drawer', () => {
    it("should be hidden if there's one item in edit or view only mode", () => {
      localStore.commit('edit_modal/SET_NODES', [testNodes[0]]);
      localStore.commit('edit_modal/SET_MODE', modes.VIEW_ONLY);
      expect(wrapper.find(EditList).exists()).toBe(false);
      localStore.commit('edit_modal/SET_MODE', modes.EDIT);
      expect(wrapper.find(EditList).exists()).toBe(false);
      localStore.commit('edit_modal/SET_MODE', modes.NEW_EXERCISE);
      expect(wrapper.find(EditList).exists()).toBe(true);
      localStore.commit('edit_modal/SET_MODE', modes.NEW_TOPIC);
      expect(wrapper.find(EditList).exists()).toBe(true);
    });
    it('should be shown in all modes if there are more than one nodes', () => {
      localStore.commit('edit_modal/SET_MODE', modes.VIEW_ONLY);
      expect(wrapper.find(EditList).exists()).toBe(true);
      localStore.commit('edit_modal/SET_MODE', modes.NEW_TOPIC);
      expect(wrapper.find(EditList).exists()).toBe(true);
      localStore.commit('edit_modal/SET_MODE', modes.EDIT);
      expect(wrapper.find(EditList).exists()).toBe(true);
      localStore.commit('edit_modal/SET_MODE', modes.NEW_EXERCISE);
      expect(wrapper.find(EditList).exists()).toBe(true);
    });
  });
  describe('on copy', () => {
    beforeEach(() => {
      localStore.commit('edit_modal/SET_MODE', modes.VIEW_ONLY);
    });
    it('should call copyNodes on click', () => {
      expect(mockFunctions.copyNodes).not.toHaveBeenCalled();
      wrapper.find({ ref: 'copybutton' }).trigger('click');
      expect(mockFunctions.copyNodes).toHaveBeenCalled();
    });
    it('should open an alert when there is related content', () => {
      wrapper.find({ ref: 'copybutton' }).trigger('click');
      expect(
        wrapper
          .find({ ref: 'relatedalert' })
          .find('.v-dialog')
          .isVisible()
      ).toBe(false);
      localStore.commit('edit_modal/SET_NODES', [generateNode({ prerequisite: ['test'] })]);
      wrapper.find({ ref: 'copybutton' }).trigger('click');
      expect(
        wrapper
          .find({ ref: 'relatedalert' })
          .find('.v-dialog')
          .isVisible()
      ).toBe(true);
    });
  });
  describe('on open', () => {
    beforeEach(() => {
      localStore.commit('edit_modal/SET_MODE', modes.EDIT);
    });
    it('should not automatically create a new item on EDIT mode', () => {
      let originalLength = localStore.state.edit_modal.nodes.length;
      wrapper.vm.openModal();
      expect(originalLength).toEqual(localStore.state.edit_modal.nodes.length);
    });
    it('should automatically select a node', () => {
      localStore.commit('edit_modal/RESET_SELECTED');
      wrapper.vm.openModal();
      wrapper.vm.$nextTick(() => {
        expect(localStore.state.edit_modal.selectedIndices).toHaveLength(1);
      });
    });
    it('should automatically create a new item on NEW_TOPIC mode', () => {
      localStore.commit('edit_modal/SET_MODE', modes.NEW_TOPIC);
      let originalLength = localStore.state.edit_modal.nodes.length;
      wrapper.vm.openModal();
      expect(localStore.state.edit_modal.nodes.length).toEqual(originalLength + 1);
    });
    it('should not automatically trigger a save event on open', () => {
      mockFunctions.saveNodes.mockReset();
      wrapper.setData({
        debouncedSave: mockFunctions.saveNodes,
      });
      localStore.commit('edit_modal/SET_MODE', modes.NEW_TOPIC);
      wrapper.vm.openModal();
      expect(mockFunctions.saveNodes).not.toHaveBeenCalled();
    });
    it('should automatically create a new item on NEW_EXERCISE mode', () => {
      localStore.commit('edit_modal/SET_MODE', modes.NEW_EXERCISE);
      let originalLength = localStore.state.edit_modal.nodes.length;
      wrapper.vm.openModal();
      expect(localStore.state.edit_modal.nodes.length).toEqual(originalLength + 1);
    });
  });
  describe('on close', () => {
    beforeEach(() => {
      localStore.commit('edit_modal/SET_MODE', modes.EDIT);
    });
    it('should trigger when closebutton is clicked', () => {
      expect(wrapper.find({ ref: 'editmodal' }).isVisible()).toBe(true);
      wrapper.find({ ref: 'closebutton' }).trigger('click');
      expect(wrapper.vm.dialog).toBe(false);
    });
    it('should catch unsaved changes', () => {
      localStore.commit('edit_modal/UPDATE_NODE', { title: 'New Title' });
      wrapper.find({ ref: 'closebutton' }).trigger('click');
      expect(wrapper.find({ ref: 'saveprompt' }).isVisible()).toBe(true);
    });
  });
  describe('on caught unsaved changes', () => {
    beforeEach(() => {
      localStore.commit('edit_modal/UPDATE_NODE', { title: 'New Title' });
      wrapper.find({ ref: 'closebutton' }).trigger('click');
      mockFunctions.saveNodes.mockReset();
    });
    it('dont save should close modal', () => {
      expect(mockFunctions.saveNodes).not.toHaveBeenCalled();
      wrapper.find({ ref: 'savepromptdontsave' }).trigger('click');
      expect(wrapper.vm.dialog).toBe(false);
      expect(localStore.state.edit_modal.nodes).toHaveLength(0);
      expect(mockFunctions.saveNodes).not.toHaveBeenCalled();
    });
    it('cancel should close dialog', () => {
      expect(mockFunctions.saveNodes).not.toHaveBeenCalled();
      wrapper.find({ ref: 'savepromptcancel' }).trigger('click');
      expect(wrapper.find({ ref: 'saveprompt' }).vm.dialog).toBe(false);
      expect(mockFunctions.saveNodes).not.toHaveBeenCalled();
    });
    it('save changes should save changes and close the modal', () => {
      expect(mockFunctions.saveNodes).not.toHaveBeenCalled();
      wrapper.find({ ref: 'savepromptsave' }).trigger('click');
      expect(wrapper.vm.dialog).toBe(false);
      expect(wrapper.find({ ref: 'saveprompt' }).vm.dialog).toBe(false);
      expect(mockFunctions.saveNodes).toHaveBeenCalled();
    });
  });
  describe('on save', () => {
    beforeEach(() => {
      localStore.commit('edit_modal/SET_MODE', modes.EDIT);
      localStore.commit('edit_modal/SET_NODES', [generateNode({ title: 'Title' })]);
      localStore.commit('edit_modal/SET_NODE', 0);
      mockFunctions.saveNodes.mockReset();
    });
    it('clicking save button should trigger save', () => {
      expect(mockFunctions.saveNodes).not.toHaveBeenCalled();
      wrapper.find({ ref: 'savebutton' }).trigger('click');
      expect(mockFunctions.saveNodes).toHaveBeenCalled();
    });
    it('autosaving should trigger when a change is made', () => {
      wrapper.setData({
        debouncedSave: mockFunctions.saveNodes,
      });
      expect(mockFunctions.saveNodes).not.toHaveBeenCalled();
      localStore.commit('edit_modal/UPDATE_NODE', { title: 'Updated Title' });
      wrapper.vm.$nextTick(() => {
        expect(mockFunctions.saveNodes).toHaveBeenCalled();
      });
    });
  });
  describe('on create', () => {
    it('EditList addNode emitted event should add new node to list', () => {
      localStore.commit('edit_modal/SET_NODES', []);
      localStore.commit('edit_modal/SET_MODE', modes.NEW_TOPIC);
      wrapper.find(EditList).vm.$emit('addNode');
      expect(localStore.state.edit_modal.nodes).toHaveLength(1);
      expect(localStore.state.edit_modal.nodes[0].kind).toEqual('topic');
    });
  });
});
