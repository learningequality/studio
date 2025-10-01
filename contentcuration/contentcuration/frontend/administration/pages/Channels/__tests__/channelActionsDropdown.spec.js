import { mount } from '@vue/test-utils';
import router from '../../../router';
import { factory } from '../../../store';
import ChannelActionsDropdown from '../ChannelActionsDropdown';

const store = factory();

const channelId = '11111111111111111111111111111111';
const channel = {
  id: channelId,
  name: 'Channel Test',
  created: new Date(),
  modified: new Date(),
  public: true,
  published: true,
  primary_token: 'testytesty',
  deleted: false,
  demo_server_url: 'demo.com',
  source_url: 'source.com',
};

function makeWrapper(channelProps = {}) {
  const mocks = {
    restore() {
      for (const key of Object.keys(this)) {
        if (key === 'restore') continue;
        this[key].mockRestore();
      }
    },
  };
  mocks.downloadPDF = jest.spyOn(ChannelActionsDropdown.methods, 'downloadPDF').mockResolvedValue();
  mocks.downloadCSV = jest.spyOn(ChannelActionsDropdown.methods, 'downloadCSV').mockResolvedValue();
  mocks.restoreHandler = jest
    .spyOn(ChannelActionsDropdown.methods, 'restoreHandler')
    .mockResolvedValue();
  mocks.softDeleteHandler = jest
    .spyOn(ChannelActionsDropdown.methods, 'softDeleteHandler')
    .mockResolvedValue();
  mocks.makePublicHandler = jest
    .spyOn(ChannelActionsDropdown.methods, 'makePublicHandler')
    .mockResolvedValue();
  mocks.makePrivateHandler = jest
    .spyOn(ChannelActionsDropdown.methods, 'makePrivateHandler')
    .mockResolvedValue();
  mocks.deleteHandler = jest
    .spyOn(ChannelActionsDropdown.methods, 'deleteHandler')
    .mockResolvedValue();

  const wrapper = mount(ChannelActionsDropdown, {
    router,
    store,
    propsData: { channelId },
    computed: {
      channel() {
        return {
          ...channel,
          ...channelProps,
        };
      },
    },
  });

  return [wrapper, mocks];
}

describe('channelActionsDropdown', () => {
  let wrapper, mocks;

  afterEach(() => {
    if (mocks) {
      mocks.restore();
    }
  });

  describe('deleted channel actions', () => {
    beforeEach(() => {
      [wrapper, mocks] = makeWrapper({ deleted: true });
    });

    it('restore channel should open restore confirmation', async () => {
      await wrapper.find('[data-test="restore"]').trigger('click');
      expect(wrapper.vm.activeDialog).toBe('restore');
    });

    it('confirm restore channel should call restoreHandler', async () => {
      await wrapper.find('[data-test="restore"]').trigger('click');
      wrapper.find('[data-test="confirm-restore"]').vm.$emit('submit');
      expect(mocks.restoreHandler).toHaveBeenCalled();
    });

    it('delete channel should open delete confirmation', async () => {
      await wrapper.find('[data-test="delete"]').trigger('click');
      expect(wrapper.vm.activeDialog).toBe('permanentDelete');
    });

    it('confirm delete channel should call deleteHandler', async () => {
      await wrapper.find('[data-test="delete"]').trigger('click');
      wrapper.find('[data-test="confirm-delete"]').vm.$emit('submit');
      expect(mocks.deleteHandler).toHaveBeenCalled();
    });
  });

  describe('live channel actions', () => {
    beforeEach(() => {
      [wrapper, mocks] = makeWrapper({ public: false, deleted: false });
    });

    it('download PDF button should call downloadPDF', async () => {
      await wrapper.find('[data-test="pdf"]').trigger('click');
      expect(mocks.downloadPDF).toHaveBeenCalled();
    });

    it('download CSV button should call downloadCSV', async () => {
      await wrapper.find('[data-test="csv"]').trigger('click');
      expect(mocks.downloadCSV).toHaveBeenCalled();
    });

    it('make public button should open make public confirmation', async () => {
      await wrapper.find('[data-test="public"]').trigger('click');
      expect(wrapper.vm.activeDialog).toBe('makePublic');
    });

    it('confirm make public should call makePublicHandler', async () => {
      await wrapper.find('[data-test="public"]').trigger('click');
      wrapper.find('[data-test="confirm-public"]').vm.$emit('submit');
      expect(mocks.makePublicHandler).toHaveBeenCalled();
    });

    it('soft delete button should open soft delete confirmation', async () => {
      await wrapper.find('[data-test="softdelete"]').trigger('click');
      expect(wrapper.vm.activeDialog).toBe('softDelete');
    });

    it('confirm soft delete button should call softDeleteHandler', async () => {
      await wrapper.find('[data-test="softdelete"]').trigger('click');
      wrapper.find('[data-test="confirm-softdelete"]').vm.$emit('submit');
      expect(mocks.softDeleteHandler).toHaveBeenCalled();
    });
  });

  describe('public channel actions', () => {
    beforeEach(() => {
      [wrapper, mocks] = makeWrapper({ public: true, deleted: false });
    });

    it('make private button should open make private confirmation', async () => {
      await wrapper.find('[data-test="private"]').trigger('click');
      expect(wrapper.vm.activeDialog).toBe('makePrivate');
    });

    it('confirm make private should call makePrivateHandler', async () => {
      await wrapper.find('[data-test="private"]').trigger('click');
      wrapper.find('[data-test="confirm-private"]').vm.$emit('submit');
      expect(mocks.makePrivateHandler).toHaveBeenCalled();
    });

    it('should not show soft delete button for public channels', () => {
      expect(wrapper.find('[data-test="softdelete"]').exists()).toBe(false);
    });
  });

  describe('modal configuration', () => {
    beforeEach(() => {
      [wrapper, mocks] = makeWrapper({ public: false, deleted: false });
    });

    it('should set correct dialog config for makePublic', async () => {
      await wrapper.find('[data-test="public"]').trigger('click');
      expect(wrapper.vm.dialogConfig.title).toBe('Make channel public');
      expect(wrapper.vm.dialogConfig.submitText).toBe('Make public');
      expect(wrapper.vm.dialogConfig.testId).toBe('confirm-public');
    });

    it('should set correct dialog config for makePrivate', async () => {
      [wrapper, mocks] = makeWrapper({ public: true, deleted: false });
      await wrapper.find('[data-test="private"]').trigger('click');
      expect(wrapper.vm.dialogConfig.title).toBe('Make channel private');
      expect(wrapper.vm.dialogConfig.submitText).toBe('Make private');
      expect(wrapper.vm.dialogConfig.testId).toBe('confirm-private');
    });

    it('should close dialog when cancel is emitted', async () => {
      await wrapper.find('[data-test="public"]').trigger('click');
      expect(wrapper.vm.activeDialog).toBe('makePublic');
      wrapper.find('[data-test="confirm-public"]').vm.$emit('cancel');
      expect(wrapper.vm.activeDialog).toBeNull();
    });

    it('should call handleSubmit when submit is emitted', async () => {
      const handleSubmitSpy = jest.spyOn(wrapper.vm, 'handleSubmit');
      await wrapper.find('[data-test="public"]').trigger('click');
      wrapper.find('[data-test="confirm-public"]').vm.$emit('submit');
      expect(handleSubmitSpy).toHaveBeenCalled();
    });
  });
});