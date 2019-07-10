import { shallowMount } from '@vue/test-utils';
import PublishWrapper from './../views/PublishWrapper.vue';
import ProgressOverlay from './../../sharedComponents/ProgressOverlay.vue';
import PublishModal from './../views/PublishModal.vue';
import { localStore } from './data.js';

function makeWrapper(task) {
  localStore.commit('SET_CURRENT_TASK', task);
  return shallowMount(PublishWrapper, {
    store: localStore,
  });
}

describe('publishWrapper', () => {
  it('publish modal should render on load', () => {
    let wrapper = makeWrapper();
    expect(wrapper.findAll(PublishModal)).toHaveLength(1);
  });
  it('overlay should render if channel is publishing', () => {
    let wrapper = makeWrapper({ id: 123 });
    expect(localStore.getters.currentTask.id).toBe(123);
    expect(wrapper.findAll(ProgressOverlay)).toHaveLength(1);
  });
  it('overlay should not render if channel is not publishing', () => {
    let wrapper = makeWrapper();
    expect(wrapper.findAll(ProgressOverlay)).toHaveLength(0);
  });
});
