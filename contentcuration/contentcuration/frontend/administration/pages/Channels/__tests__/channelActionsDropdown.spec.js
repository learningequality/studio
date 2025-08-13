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
  mocks.deleteChannel = jest
    .spyOn(ChannelActionsDropdown.methods, 'deleteChannel')
    .mockResolvedValue();
  mocks.updateChannel = jest
    .spyOn(ChannelActionsDropdown.methods, 'updateChannel')
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
      await wrapper.findComponent('[data-test="restore"]').trigger('click');
      expect(wrapper.vm.restoreDialog).toBe(true);
    });

    it('confirm restore channel should call updateChannel with deleted = false', () => {
      wrapper.findComponent('[data-test="confirm-restore"]').vm.$emit('confirm');
      expect(mocks.updateChannel).toHaveBeenCalledWith({ id: channelId, deleted: false });
    });

    it('delete channel should open delete confirmation', async () => {
      await wrapper.findComponent('[data-test="delete"]').trigger('click');
      expect(wrapper.vm.deleteDialog).toBe(true);
    });

    it('confirm delete channel should call deleteChannel', () => {
      wrapper.findComponent('[data-test="confirm-delete"]').vm.$emit('confirm');
      expect(mocks.deleteChannel).toHaveBeenCalledWith(channelId);
    });
  });

  describe('live channel actions', () => {
    beforeEach(() => {
      [wrapper, mocks] = makeWrapper({ public: false, deleted: false });
    });

    it('download PDF button should call downloadPDF', async () => {
      await wrapper.findComponent('[data-test="pdf"]').trigger('click');
      expect(mocks.downloadPDF).toHaveBeenCalled();
    });

    it('download CSV button should call downloadCSV', async () => {
      await wrapper.findComponent('[data-test="csv"]').trigger('click');
      expect(mocks.downloadCSV).toHaveBeenCalled();
    });

    it('make public button should open make public confirmation', async () => {
      await wrapper.findComponent('[data-test="public"]').trigger('click');
      expect(wrapper.vm.makePublicDialog).toBe(true);
    });

    it('confirm make public should call updateChannel with isPublic = true', () => {
      wrapper.findComponent('[data-test="confirm-public"]').vm.$emit('confirm');
      expect(mocks.updateChannel).toHaveBeenCalledWith({ id: channelId, isPublic: true });
    });

    it('soft delete button should open soft delete confirmation', async () => {
      await wrapper.findComponent('[data-test="softdelete"]').trigger('click');
      expect(wrapper.vm.softDeleteDialog).toBe(true);
    });

    it('confirm soft delete button should call updateChannel with deleted = true', () => {
      wrapper.findComponent('[data-test="confirm-softdelete"]').vm.$emit('confirm');
      expect(mocks.updateChannel).toHaveBeenCalledWith({ id: channelId, deleted: true });
    });
  });

  describe('public channel actions', () => {
    beforeEach(() => {
      [wrapper, mocks] = makeWrapper();
    });

    it('make private button should open make private confirmation', async () => {
      await wrapper.findComponent('[data-test="private"]').trigger('click');
      expect(wrapper.vm.makePrivateDialog).toBe(true);
    });

    it('confirm make private should call updateChannel with isPublic = false', () => {
      wrapper.findComponent('[data-test="confirm-private"]').vm.$emit('confirm');
      expect(mocks.updateChannel).toHaveBeenCalledWith({ id: channelId, isPublic: false });
    });
  });
});
