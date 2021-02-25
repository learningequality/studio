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
      wrapper.setData({ step: steps.VALIDATION });
    });
    it('next button should go to the next step if enabled', () => {
      wrapper
        .find('[data-test="incomplete-modal"]')
        .find('form')
        .trigger('submit');
      expect(wrapper.vm.step).toBe(steps.PUBLISH);
    });
    it('cancel button should close modal', () => {
      wrapper
        .find('[data-test="incomplete-modal"]')
        .find('button[name="cancel"]')
        .trigger('click');
      expect(wrapper.emitted('input')[0][0]).toBe(false);
    });
  });
  describe('on publish step', () => {
    let publishChannel = jest.fn();
    beforeEach(() => {
      wrapper.setData({ step: steps.PUBLISH });
      wrapper.setMethods({
        publishChannel: () => {
          return new Promise(resolve => {
            publishChannel();
            resolve();
          });
        },
      });
      publishChannel.mockReset();
    });
    it('publish button should trigger form validation', () => {
      wrapper.vm.$refs.form.validate = jest.fn();
      wrapper
        .find('[data-test="confirm-publish-modal"]')
        .find('form')
        .trigger('submit');
      expect(wrapper.vm.$refs.form.validate).toHaveBeenCalled();
    });
    it('publishing should be blocked if no description is given', () => {
      wrapper
        .find('[data-test="confirm-publish-modal"]')
        .find('form')
        .trigger('submit');
      expect(publishChannel).not.toHaveBeenCalled();
    });
    it('publish button should call publishChannel if description is given', () => {
      let description = 'Version notes';
      wrapper.setData({ publishDescription: description });
      wrapper
        .find('[data-test="confirm-publish-modal"]')
        .find('form')
        .trigger('submit');
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
