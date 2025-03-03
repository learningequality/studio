import { mount } from '@vue/test-utils';
import PublishModal from '../PublishModal';
import { factory } from '../../../store';

const store = factory();

const steps = {
  VALIDATION: 0,
  PUBLISH: 1,
};

const testMetadata = {
  id: 'sample channel',
  language: 'en',
};

const loadChannelSize = jest.fn();

function makeWrapper(channel = {}, node = {}) {
  return mount(PublishModal, {
    store,
    propsData: {
      value: true,
    },
    computed: {
      currentChannel() {
        return {
          ...testMetadata,
          ...channel,
        };
      },
      node() {
        return {
          resource_count: 100,
          ...node,
        };
      },
    },
    methods: {
      loadChannelSize() {
        return new Promise(resolve => {
          loadChannelSize();
          resolve();
        });
      },
    },
  });
}

describe('publishModal', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
    loadChannelSize.mockReset();
  });
  describe('on load', () => {
    it('should load channel size', () => {
      expect(loadChannelSize).toHaveBeenCalled;
    });
    it('should default to publish description view', () => {
      expect(wrapper.vm.step).toBe(steps.PUBLISH);
    });
    it('should start at validation view if invalid nodes are detected', () => {
      const invalidWrapper = makeWrapper({}, { error_count: 1 });
      expect(invalidWrapper.vm.step).toBe(steps.VALIDATION);
    });
  });
  describe('on validation step', () => {
    beforeEach(() => {
      wrapper.setData({ step: steps.VALIDATION, loading: false });
    });
    it('next button should go to the next step if enabled', () => {
      wrapper.find('[data-test="incomplete-modal"]').find('form').trigger('submit');
      expect(wrapper.vm.step).toBe(steps.PUBLISH);
    });
    it('cancel button should close modal', () => {
      wrapper.find('[data-test="incomplete-modal"]').find('button[name="cancel"]').trigger('click');
      expect(wrapper.emitted('input')[0][0]).toBe(false);
    });
  });
  describe('on publish step', () => {
    const updateChannel = jest.fn();
    const publishChannel = jest.fn();

    beforeEach(() => {
      wrapper.setData({ step: steps.PUBLISH });
      wrapper.setMethods({
        updateChannel: () => {
          return new Promise(resolve => {
            updateChannel();
            publishChannel();
            resolve();
          });
        },
      });
      updateChannel.mockReset();
      publishChannel.mockReset();
    });
    it('publish button should trigger form validation', () => {
      expect(wrapper.text()).not.toContain(
        "Please describe what's new in this version before publishing",
      );
      wrapper.find('[data-test="confirm-publish-modal"]').find('form').trigger('submit');
      expect(wrapper.text()).toContain(
        "Please describe what's new in this version before publishing",
      );
    });
    it('publishing should be blocked if no description & language are given', () => {
      wrapper.find('[data-test="confirm-publish-modal"]').find('form').trigger('submit');
      expect(updateChannel).not.toHaveBeenCalled();
      expect(publishChannel).not.toHaveBeenCalled();
    });
    it('publish button should call updateChannel if description and language are given', () => {
      const description = 'Version notes';
      const language = {
        value: 'en',
        label: 'English',
      };
      wrapper.setData({ publishDescription: description, language });
      wrapper.find('[data-test="confirm-publish-modal"]').find('form').trigger('submit');
      expect(updateChannel).toHaveBeenCalled();
      expect(publishChannel).toHaveBeenCalled();
    });
    it('cancel button on publish step should also close modal', () => {
      wrapper
        .find('[data-test="confirm-publish-modal"]')
        .find('button[name="cancel"]')
        .trigger('click');
      expect(wrapper.emitted('input')[0][0]).toBe(false);
    });
  });
});
