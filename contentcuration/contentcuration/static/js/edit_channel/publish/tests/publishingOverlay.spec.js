import { shallowMount } from '@vue/test-utils';
import PublishingOverlay from './../views/PublishingOverlay.vue';
import { localStore } from './data.js';
import ProgressOverlay from 'edit_channel/sharedComponents/ProgressOverlay.vue';

let testChannel = {
  id: 'test',
  main_tree: {},
};

function makeWrapper(channel = {}) {
  localStore.commit('publish/SET_CHANNEL', {
    ...testChannel,
    ...channel,
  });
  localStore.commit('publish/SET_TASK', 'task-id');
  return shallowMount(PublishingOverlay, {
    store: localStore,
  });
}

describe('publishingOverlay', () => {
  it('on load should contain one ProgressOverlay child component', () => {
    let wrapper = makeWrapper();
    expect(wrapper.findAll(ProgressOverlay)).toHaveLength(1);
  });
});
