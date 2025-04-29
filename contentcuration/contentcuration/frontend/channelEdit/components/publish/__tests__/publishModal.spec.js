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

function makeWrapper(channel = {}, node = {}) {
  const mocks = {};

  mocks.channelLanguageExistsInResources = jest
    .spyOn(PublishModal.methods, 'channelLanguageExistsInResources')
    .mockResolvedValue(false);
  mocks.getLanguagesInChannelResources = jest
    .spyOn(PublishModal.methods, 'getLanguagesInChannelResources')
    .mockResolvedValue(['en']);

  const wrapper = mount(PublishModal, {
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
  });

  return [wrapper, mocks];
}

describe('publishModal', () => {
  let wrapper, methodMocks;

  beforeEach(() => {
    [wrapper, methodMocks] = makeWrapper();
  });

  describe('on load', () => {
    it('should load necessary data at mount', () => {
      // expect(methodMocks.loadChannelSize).toHaveBeenCalled;
      expect(methodMocks.channelLanguageExistsInResources).toHaveBeenCalled();
      expect(methodMocks.getLanguagesInChannelResources).toHaveBeenCalled();
    });

    it('should default to publish description view', () => {
      expect(wrapper.vm.step).toBe(steps.PUBLISH);
    });

    it('should start at validation view if invalid nodes are detected', () => {
      const [invalidWrapper] = makeWrapper({}, { error_count: 1 });
      expect(invalidWrapper.vm.step).toBe(steps.VALIDATION);
    });
  });

  describe('on validation step', () => {
    beforeEach(async () => {
      await wrapper.setData({ step: steps.VALIDATION, loading: false });
    });

    it('next button should go to the next step if enabled', async () => {
      await wrapper.findComponent('[data-test="incomplete-modal"]').find('form').trigger('submit');
      expect(wrapper.vm.step).toBe(steps.PUBLISH);
    });

    it('cancel button should close modal', async () => {
      await wrapper
        .find('[data-test="incomplete-modal"]')
        .find('button[name="cancel"]')
        .trigger('click');
      expect(wrapper.emitted('input')[0][0]).toBe(false);
    });
  });

  describe('on publish step', () => {
    let updateChannel, publishChannel;

    beforeEach(async () => {
      await wrapper.setData({ step: steps.PUBLISH });
      updateChannel = jest.spyOn(wrapper.vm, 'updateChannel').mockResolvedValue();
      publishChannel = jest.spyOn(wrapper.vm, 'publishChannel').mockResolvedValue();
    });

    it('publish button should trigger form validation', async () => {
      expect(wrapper.text()).not.toContain(
        "Please describe what's new in this version before publishing",
      );
      await wrapper
        .findComponent('[data-test="confirm-publish-modal"]')
        .find('form')
        .trigger('submit');
      expect(wrapper.text()).toContain(
        "Please describe what's new in this version before publishing",
      );
    });

    it('publishing should be blocked if no description & language are given', async () => {
      await wrapper
        .findComponent('[data-test="confirm-publish-modal"]')
        .find('form')
        .trigger('submit');
      expect(updateChannel).not.toHaveBeenCalled();
      expect(publishChannel).not.toHaveBeenCalled();
    });

    it('publish button should call updateChannel if description and language are given', async () => {
      const description = 'Version notes';
      const language = {
        value: 'en',
        label: 'English',
      };
      await wrapper.setData({ publishDescription: description, language });
      await wrapper
        .findComponent('[data-test="confirm-publish-modal"]')
        .find('form')
        .trigger('submit');
      expect(updateChannel).toHaveBeenCalled();
      expect(publishChannel).toHaveBeenCalled();
    });

    it('cancel button on publish step should also close modal', async () => {
      await wrapper
        .findComponent('[data-test="confirm-publish-modal"]')
        .findComponent('button[name="cancel"]')
        .trigger('click');
      expect(wrapper.emitted('input')[0][0]).toBe(false);
    });
  });
});
