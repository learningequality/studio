import { mount } from '@vue/test-utils';
import PublishModal from './../views/PublishModal.vue';
import PublishView from './../views/PublishView.vue';
import { localStore, mockFunctions } from './data.js';

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
      expect(wrapper.findAll(PublishView)).toHaveLength(1);
    });
    it('publish button should be disabled if no changes are found', () => {
      let channelData = {
        main_tree: {
          metadata: { has_changed_descendant: false },
        },
      };
      let testWrapper = makeWrapper(channelData);
      expect(testWrapper.find('.open-modal-button').attributes('disabled')).toBeTruthy();
    });
    it('publish button should be enabled if changes are found', () => {
      expect(wrapper.find('.open-modal-button').attributes('disabled')).toBeFalsy();
    });
    it('main publish button should be disabled if no language is set', () => {
      let testWrapper = makeWrapper({ language: null });
      expect(testWrapper.find('.main-publish-button').attributes('disabled')).toBeTruthy();
    });
    it('main publish button should be enabled if all required fields are filled out', () => {
      expect(wrapper.find('.main-publish-button').attributes('disabled')).toBeFalsy();
    });
    it('should show correct number of resources', () => {
      expect(wrapper.find('.size-text').text()).toContain('100');
      expect(wrapper.vm.channelCount).toEqual(100);
    });
  });
  describe('on toggle', () => {
    let openButton;
    beforeEach(() => {
      openButton = wrapper.find('.open-modal-button');
      mockFunctions.publishChannel.mockReset();
      mockFunctions.loadChannelSize.mockReset();
    });
    it('PUBLISH button should open modal', () => {
      openButton.trigger('click');
      expect(wrapper.vm.dialog).toBe(true);
      expect(wrapper.find('.v-dialog').isVisible()).toBe(true);
    });
    it('CANCEL button should close modal', () => {
      openButton.trigger('click');
      wrapper.find('.cancel-button').trigger('click');
      expect(wrapper.vm.dialog).toBe(false);
      expect(wrapper.find('.v-dialog').isVisible()).toBe(false);
    });
    it('loadChannelSize should be called when modal is opened', () => {
      openButton.trigger('click');
      expect(mockFunctions.loadChannelSize).toHaveBeenCalled();
    });
  });
  it('PUBLISH button should call publishChannel', () => {
    wrapper.find('.main-publish-button').trigger('click');
    expect(mockFunctions.publishChannel).toHaveBeenCalled();
  });
});
