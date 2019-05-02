import { shallowMount } from '@vue/test-utils';
import PublishWrapper from './../views/PublishWrapper.vue';
import PublishingOverlay from './../views/PublishingOverlay.vue';
import PublishModal from './../views/PublishModal.vue';
import { localStore } from './data.js';

function makeWrapper(taskID) {
  localStore.commit('publish/SET_TASK', taskID);
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
    let wrapper = makeWrapper('task');
    expect(wrapper.findAll(PublishingOverlay)).toHaveLength(1);
  });
  it('overlay should not render if channel is not publishing', () => {
    let wrapper = makeWrapper();
    expect(wrapper.findAll(PublishingOverlay)).toHaveLength(0);
  });
});
