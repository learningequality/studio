import { mount } from '@vue/test-utils';
import EditView from './../views/EditView.vue';
import {
  localStore,
  mockFunctions,
  DEFAULT_TOPIC,
  DEFAULT_VIDEO,
  DEFAULT_EXERCISE,
} from './data.js';

const testNodes = [DEFAULT_TOPIC, DEFAULT_VIDEO, DEFAULT_EXERCISE];

function makeWrapper(props = {}) {
  let wrapper = mount(EditView, {
    store: localStore,
    attachToDocument: true,
    propsData: props,
  });
  return wrapper;
}

describe('editView', () => {
  let wrapper;
  beforeEach(() => {
    localStore.commit('edit_modal/SET_NODES', testNodes);
    mockFunctions.loadNodes.mockReset();
    wrapper = makeWrapper();
    wrapper.setData({
      loadNodesDebounced: mockFunctions.loadNodes,
    });
  });
  it('should show default text when no nodes are selected', () => {
    expect(wrapper.find('.default-content').exists()).toBe(true);
  });
  it('should load nodes when selected', () => {
    localStore.commit('edit_modal/SET_NODE', 0);
    wrapper.vm.$nextTick(() => {
      expect(mockFunctions.loadNodes).toHaveBeenCalled();
    });
  });
  it('should render tabs depending on the selected node kind', () => {
    // Topics -> Details + Preview
    localStore.commit('edit_modal/SET_NODE', 0);
    expect(wrapper.vm.showQuestionsTab).toBe(false);
    expect(wrapper.vm.showPrerequisitesTab).toBe(false);

    // Videos -> Details + Preview + Prerequisites
    localStore.commit('edit_modal/SET_NODE', 1);
    expect(wrapper.vm.showQuestionsTab).toBe(false);
    expect(wrapper.vm.showPrerequisitesTab).toBe(true);

    // Exercises -> Details + Preview + Questions + Prerequisites
    localStore.commit('edit_modal/SET_NODE', 2);
    expect(wrapper.vm.showQuestionsTab).toBe(true);
    expect(wrapper.vm.showPrerequisitesTab).toBe(true);
  });
  it('prerequisites tab should be hidden on clipboard items', () => {
    let testWrapper = makeWrapper({ isClipboard: true });
    localStore.commit('edit_modal/SET_NODE', 1);
    expect(testWrapper.find({ ref: 'prerequisitetab' }).exists()).toBe(false);
  });
});
