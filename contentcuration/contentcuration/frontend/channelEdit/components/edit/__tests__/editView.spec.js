import { mount } from '@vue/test-utils';
import EditView from '../EditView.vue';
import {
  localStore,
  mockFunctions,
  DEFAULT_TOPIC,
  DEFAULT_VIDEO,
  DEFAULT_EXERCISE,
} from './data.js';

const testNodes = [DEFAULT_TOPIC, DEFAULT_VIDEO, DEFAULT_EXERCISE];

function makeWrapper(props = {}) {
  const wrapper = mount(EditView, {
    store: localStore,
    attachTo: document.body,
    propsData: props,
  });
  return wrapper;
}

describe.skip('editView', () => {
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
    expect(wrapper.vm.showRelatedResourcesTab).toBe(false);

    // Videos -> Details + Preview + Related resources
    localStore.commit('edit_modal/SET_NODE', 1);
    expect(wrapper.vm.showQuestionsTab).toBe(false);
    expect(wrapper.vm.showRelatedResourcesTab).toBe(true);

    // Exercises -> Details + Preview + Questions + Related resources
    localStore.commit('edit_modal/SET_NODE', 2);
    expect(wrapper.vm.showQuestionsTab).toBe(true);
    expect(wrapper.vm.showRelatedResourcesTab).toBe(true);
  });
  it('related resources tab should be hidden on clipboard items', () => {
    const testWrapper = makeWrapper({ isClipboard: true });
    localStore.commit('edit_modal/SET_NODE', 1);
    expect(testWrapper.find({ ref: 'related-resources-tab' }).exists()).toBe(false);
  });
});
