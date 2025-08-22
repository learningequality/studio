import { mount } from '@vue/test-utils';
import { modes } from '../../../constants';
import EditModal from '../EditModal';
import EditList from '../EditList';
import { localStore, mockFunctions, generateNode, DEFAULT_TOPIC, DEFAULT_TOPIC2 } from './data';
import Uploader from 'shared/views/files/Uploader';

const testNodes = [DEFAULT_TOPIC, DEFAULT_TOPIC2];

function makeWrapper(props = {}) {
  const wrapper = mount(EditModal, {
    store: localStore,
    attachTo: document.body,
    propsData: props,
    stubs: ['SavingIndicator'],
  });
  return wrapper;
}

describe.skip('editModal', () => {
  let wrapper;
  beforeEach(() => {
    localStore.commit('edit_modal/SET_NODES', testNodes);
    wrapper = makeWrapper();
    wrapper.vm.dialog = true;
    mockFunctions.copyNodes.mockReset();
    mockFunctions.saveNodes.mockReset();
  });
  describe('on render', () => {
    it('should show the correct buttons based on the mode', () => {
      // View only mode by default
      expect(wrapper.find('[data-test="save"]').exists()).toBe(false);
      expect(wrapper.find('[data-test="copy"]').exists()).toBe(true);
      localStore.commit('edit_modal/SET_MODE', modes.EDIT);
      wrapper.vm.$nextTick(() => {
        expect(wrapper.find('[data-test="save"]').exists()).toBe(true);
        expect(wrapper.find('[data-test="copy"]').exists()).toBe(false);
      });
    });
  });
  describe('navigation drawer', () => {
    it("should be hidden if there's one item in edit or view only mode", () => {
      localStore.commit('edit_modal/SET_NODES', [testNodes[0]]);
      localStore.commit('edit_modal/SET_MODE', modes.EDIT);

      wrapper.vm.$nextTick(() => {
        expect(wrapper.find(EditList).exists()).toBe(false);
        localStore.commit('edit_modal/SET_MODE', modes.NEW_EXERCISE);
        wrapper.vm.$nextTick(() => {
          expect(wrapper.find(EditList).exists()).toBe(true);
        });
      });
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
      wrapper.find('[data-test="copy"]').trigger('click');
      expect(mockFunctions.copyNodes).toHaveBeenCalled();
    });
    it('should open an alert when there is related content', () => {
      const alert = wrapper.find({ ref: 'relatedalert' }).find({ ref: 'alert' });
      wrapper.find('[data-test="copy"]').trigger('click');
      expect(alert.vm.dialog).toBe(false);
      localStore.commit('edit_modal/SET_NODES', [generateNode({ prerequisite: ['test'] })]);
      wrapper.find('[data-test="copy"]').trigger('click');
      expect(alert.vm.dialog).toBe(true);
    });
  });
  describe('on open', () => {
    const addStub = jest.fn();
    beforeEach(() => {
      addStub.mockReset();
      localStore.commit('edit_modal/SET_MODE', modes.EDIT);
    });
    it('should not automatically create a new item on EDIT mode', () => {
      const originalLength = localStore.state.edit_modal.nodes.length;
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
      wrapper.setMethods({
        addNodeToList: addStub,
      });
      wrapper.vm.openModal();
      expect(addStub).toHaveBeenCalled();
      expect(addStub.mock.calls[0][0].kind).toBe('topic');
    });
    it('should automatically create a new item on NEW_EXERCISE mode', () => {
      wrapper.setMethods({
        addNodeToList: addStub,
      });
      localStore.commit('edit_modal/SET_MODE', modes.NEW_EXERCISE);
      wrapper.vm.openModal();
      expect(addStub).toHaveBeenCalled();
      expect(addStub.mock.calls[0][0].kind).toBe('exercise');
    });
    it('should create a new item when files are uploaded', () => {
      wrapper.setMethods({
        createNodesFromFiles: addStub,
      });
      localStore.commit('edit_modal/SET_MODE', modes.UPLOAD);
      wrapper.vm.$nextTick(() => {
        wrapper.find(Uploader).vm.$emit('uploading');
        expect(addStub).toHaveBeenCalled();
      });
    });
  });
  describe('on close', () => {
    it('should trigger when closebutton is clicked', () => {
      localStore.commit('edit_modal/SET_MODE', modes.VIEW_ONLY);
      wrapper.find('[data-test="close"]').trigger('click');
      expect(wrapper.vm.dialog).toBe(false);
    });
    it('should catch invalid changes', () => {
      localStore.commit('edit_modal/SET_MODE', modes.EDIT);
      localStore.commit('edit_modal/UPDATE_NODE', { title: '' });
      wrapper.find('[data-test="close"]').trigger('click');
      expect(wrapper.find({ ref: 'saveprompt' }).isVisible()).toBe(true);
    });
    it('should call save when save anyways is called', () => {
      mockFunctions.saveNodes.mockReset();
      wrapper.setMethods({ handleForceSave: mockFunctions.saveNodes });
      wrapper.find('[data-test="saveanyways"]').trigger('click');
      expect(mockFunctions.saveNodes).toHaveBeenCalled();
    });
    it('should catch uploads in progress', () => {
      localStore.commit('edit_modal/UPDATE_NODE', { files: [{ progress: 0.5, uploading: true }] });
      wrapper.find('[data-test="close"]').trigger('click');
      expect(mockFunctions.saveNodes).not.toHaveBeenCalled();
      expect(wrapper.find({ ref: 'uploadsprompt' }).isVisible()).toBe(true);
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
      wrapper.setMethods({
        handleSave: mockFunctions.saveNodes,
      });
      wrapper.find('[data-test="save"]').trigger('click');
      expect(mockFunctions.saveNodes).toHaveBeenCalled();
    });
  });
});
