import { mount } from '@vue/test-utils';
import LanguageDropdown from './../../sharedComponents/LanguageDropdown.vue';
import PublishView from './../views/PublishView.vue';
import { localStore, mockFunctions } from './data.js';

document.body.setAttribute('data-app', true); // Vuetify prints a warning without this

let testChannel = {
  id: 'test',
  name: 'Test Channel',
  version: 10,
  language: 'en',
  main_tree: {
    metadata: {
      resource_count: 100,
    },
  },
};

const steps = {
  LANGUAGE_STEP: 0,
  PUBLISH_STEP: 1,
};

function makeWrapper(channel = {}) {
  localStore.commit('publish/SET_CHANNEL', {
    ...testChannel,
    ...channel,
  });
  return mount(PublishView, {
    store: localStore,
    sync: false,
  });
}

describe('publishView', () => {
  let wrapper;
  beforeEach(() => {
    mockFunctions.loadChannelSize.mockReset();
    wrapper = makeWrapper();
  });

  describe('on load', () => {
    it('should render LanguageDropdown', () => {
      expect(wrapper.find(LanguageDropdown).exists()).toBe(true);
    });

    it('should show correct number of resources', () => {
      wrapper.setData({ size: 100 });
      expect(wrapper.vm.sizeText).toContain('100');
      expect(wrapper.vm.channelCount).toEqual(100);
    });

    it('should call loadChannelSize on mount', () => {
      wrapper.vm.$nextTick(() => {
        expect(mockFunctions.loadChannelSize).toHaveBeenCalled();
      });
    });
  });

  describe('on LanguageDropdown emitting changed', () => {
    let languageDropdown;
    beforeEach(() => {
      languageDropdown = wrapper.find(LanguageDropdown);
      mockFunctions.setChannelLanguage.mockReset();
    });
    it('should call setChannelLanguage', () => {
      languageDropdown.vm.$emit('changed', 'en');
      expect(mockFunctions.setChannelLanguage).toHaveBeenCalled();
    });
    it('should set savingLanguage to true', () => {
      languageDropdown.vm.$emit('changed', 'en');
      expect(wrapper.vm.savingLanguage).toBe(true);
    });
  });
  describe('buttons', () => {
    it('buttons should not all be shown immediately', () => {
      expect(wrapper.find({ ref: 'cancelbutton' }).isVisible()).toBe(true);
      expect(wrapper.find({ ref: 'nextbutton' }).isVisible()).toBe(true);
      expect(wrapper.find({ ref: 'backbutton' }).isVisible()).toBe(false);
      expect(wrapper.find({ ref: 'publishbutton' }).isVisible()).toBe(false);
    });
    it('next should be disabled if channel is invalid', () => {
      let testWrapper = makeWrapper({ language: null });
      expect(testWrapper.find({ ref: 'nextbutton' }).props('disabled')).toBe(true);
    });
    it('next should increment step', () => {
      wrapper.find({ ref: 'nextbutton' }).trigger('click');
      expect(wrapper.vm.step).toEqual(steps.LANGUAGE_STEP + 1);
    });
    it('back should decrement step', () => {
      wrapper.setData({ step: steps.PUBLISH_STEP });
      wrapper.find({ ref: 'backbutton' }).trigger('click');
      expect(wrapper.vm.step).toEqual(steps.PUBLISH_STEP - 1);
    });
    it('cancel should emit cancel event', () => {
      wrapper.find({ ref: 'cancelbutton' }).trigger('click');
      expect(wrapper.emitted('cancel')).toBeTruthy();
    });
    it('publish should not go through if there is no message', () => {
      mockFunctions.publishChannel.mockReset();
      wrapper.find({ ref: 'publishbutton' }).trigger('click');
      expect(wrapper.emitted('publish')).toBeFalsy();
      expect(mockFunctions.publishChannel).not.toHaveBeenCalled();
    });
    it('publish should call publishChannel action', () => {
      mockFunctions.publishChannel.mockReset();
      wrapper.setData({ publishDescription: 'Test Description' });
      wrapper.vm.$nextTick(() => {
        wrapper.find({ ref: 'publishbutton' }).trigger('click');
        expect(wrapper.emitted('publish')).toBeTruthy();
        expect(mockFunctions.publishChannel).toHaveBeenCalled();
      });
    });
  });
});
