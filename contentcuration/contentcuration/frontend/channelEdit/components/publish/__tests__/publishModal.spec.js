import { mount } from '@vue/test-utils';
import PublishModal from '../PublishModal';
import store from '../../../store';

const steps = {
  VALIDATION: 0,
  PUBLISH: 1,
};

const testMetadata = {
  id: 'sample channel',
  language: 'en',
};

const loadChannelSize = jest.fn();

function makeWrapper(channel = {}) {
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
  });
  describe('on validation step', () => {
    beforeEach(() => {
      wrapper.setData({ step: steps.VALIDATION });
    });
    it('setting language should update the channel', () => {
      let updateChannel = jest.fn();
      wrapper.setMethods({ updateChannel });
      wrapper.vm.language = 'en';
      expect(updateChannel).toHaveBeenCalled();
      expect(updateChannel.mock.calls[0][0].id).toBe(testMetadata.id);
      expect(updateChannel.mock.calls[0][0].language).toBe('en');
    });
    it('next button should be disabled if channel is invalid', () => {
      let invalidWrapper = makeWrapper({ language: null });
      expect(invalidWrapper.vm.isValid).toBe(false);
    });
    it('next button should go to the next step if enabled', () => {
      wrapper.find('[data-test="next"]').trigger('click');
      expect(wrapper.vm.step).toBe(steps.PUBLISH);
    });
    it('cancel button should close modal', () => {
      wrapper.find('[data-test="cancel"]').trigger('click');
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
      wrapper.find('[data-test="publish"]').trigger('click');
      expect(wrapper.vm.$refs.form.validate).toHaveBeenCalled();
    });
    it('publishing should be blocked if no description is given', () => {
      wrapper.find('[data-test="publish"]').trigger('click');
      expect(publishChannel).not.toHaveBeenCalled();
    });
    it('publish button should call publishChannel if description is given', () => {
      let description = 'Version notes';
      wrapper.setData({ publishDescription: description });
      wrapper.find('[data-test="publish"]').trigger('click');
      expect(publishChannel).toHaveBeenCalled();
    });
    it('back should go back to the validation step', () => {
      wrapper.find('[data-test="back"]').trigger('click');
      expect(wrapper.vm.step).toBe(steps.VALIDATION);
    });
  });
});
