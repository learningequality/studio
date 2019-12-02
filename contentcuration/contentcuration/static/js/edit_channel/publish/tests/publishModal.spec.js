import { mount } from '@vue/test-utils';
import PublishModal from './../views/PublishModal.vue';
import PublishView from './../views/PublishView.vue';
import { localStore } from './data.js';

const testMetadata = {
  language: 'en',
  main_tree: {
    metadata: {
      has_changed_descendant: true,
      resource_count: 100,
    },
  },
};

document.body.setAttribute('data-app', true); // Vuetify prints a warning without this

function makeWrapper(channel = {}) {
  let channelData = {
    ...testMetadata,
    ...channel,
  };
  localStore.commit('publish/SET_CHANNEL', channelData);
  localStore.commit('SET_EDIT_MODE', true);

  return mount(PublishModal, {
    store: localStore,
    attachToDocument: true,
  });
}

describe('publishModal', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  describe('on render', () => {
    it('publish view should render', () => {
      wrapper.setData({ dialog: true });
      expect(wrapper.findAll(PublishView)).toHaveLength(1);
    });
    it('publish button should be disabled if no changes are found', () => {
      let channelData = {
        main_tree: {
          metadata: { has_changed_descendant: false },
        },
      };
      let testWrapper = makeWrapper(channelData);
      expect(testWrapper.find({ ref: 'open-modal-button' }).props('disabled')).toBe(true);
    });

    it('publish button should be enabled if changes are found', () => {
      expect(wrapper.find({ ref: 'open-modal-button' }).props('disabled')).toBe(false);
    });
  });
  describe('on toggle', () => {
    it('PUBLISH button should open modal', () => {
      wrapper.find({ ref: 'open-modal-button' }).trigger('click');
      expect(wrapper.vm.dialog).toBe(true);
    });
    it('PublishView emitted cancel event should close modal', () => {
      wrapper.setData({ dialog: true });
      wrapper.find(PublishView).vm.$emit('cancel');
      expect(wrapper.vm.dialog).toBe(false);
    });
    it('PublishView emitted publish event should close modal', () => {
      wrapper.setData({ dialog: true });
      wrapper.find(PublishView).vm.$emit('publish');
      expect(wrapper.vm.dialog).toBe(false);
    });
  });
});
