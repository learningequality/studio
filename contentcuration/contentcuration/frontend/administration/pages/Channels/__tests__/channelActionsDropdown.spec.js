import { mount } from '@vue/test-utils';
import router from '../../../router';
import { factory } from '../../../store';
import ChannelActionsDropdown from '../ChannelActionsDropdown';

const store = factory();

const channelId = '11111111111111111111111111111111';
const updateChannel = jest.fn().mockReturnValue(Promise.resolve());
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
  return mount(ChannelActionsDropdown, {
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
    methods: { updateChannel },
  });
}

describe('channelActionsDropdown', () => {
  let wrapper;
  beforeEach(() => {
    updateChannel.mockClear();
  });

  describe('deleted channel actions', () => {
    beforeEach(() => {
      wrapper = makeWrapper({ deleted: true });
    });
    it('restore channel should open restore confirmation', () => {
      wrapper.find('[data-test="restore"]').trigger('click');
      expect(wrapper.vm.restoreDialog).toBe(true);
    });
    it('confirm restore channel should call updateChannel with deleted = false', () => {
      wrapper.find('[data-test="confirm-restore"]').vm.$emit('confirm');
      expect(updateChannel).toHaveBeenCalledWith({ id: channelId, deleted: false });
    });
    it('delete channel should open delete confirmation', () => {
      wrapper.find('[data-test="delete"]').trigger('click');
      expect(wrapper.vm.deleteDialog).toBe(true);
    });
    it('confirm delete channel should call deleteChannel', () => {
      const deleteChannel = jest.fn().mockReturnValue(Promise.resolve());
      wrapper.setMethods({ deleteChannel });
      wrapper.find('[data-test="confirm-delete"]').vm.$emit('confirm');
      expect(deleteChannel).toHaveBeenCalledWith(channelId);
    });
  });
  describe('live channel actions', () => {
    beforeEach(() => {
      wrapper = makeWrapper({ public: false, deleted: false });
    });
    it('download PDF button should call downloadPDF', () => {
      const downloadPDF = jest.fn();
      wrapper.setMethods({ downloadPDF });
      wrapper.find('[data-test="pdf"]').trigger('click');
      expect(downloadPDF).toHaveBeenCalled();
    });
    it('download CSV button should call downloadCSV', () => {
      const downloadCSV = jest.fn();
      wrapper.setMethods({ downloadCSV });
      wrapper.find('[data-test="csv"]').trigger('click');
      expect(downloadCSV).toHaveBeenCalled();
    });
    it('make public button should open make public confirmation', () => {
      wrapper.find('[data-test="public"]').trigger('click');
      expect(wrapper.vm.makePublicDialog).toBe(true);
    });
    it('confirm make public should call updateChannel with isPublic = true', () => {
      wrapper.find('[data-test="confirm-public"]').vm.$emit('confirm');
      expect(updateChannel).toHaveBeenCalledWith({ id: channelId, isPublic: true });
    });
    it('soft delete button should open soft delete confirmation', () => {
      wrapper.find('[data-test="softdelete"]').trigger('click');
      expect(wrapper.vm.softDeleteDialog).toBe(true);
    });
    it('confirm soft delete button should call updateChannel with deleted = true', () => {
      wrapper.find('[data-test="confirm-softdelete"]').vm.$emit('confirm');
      expect(updateChannel).toHaveBeenCalledWith({ id: channelId, deleted: true });
    });
  });
  describe('public channel actions', () => {
    beforeEach(() => {
      wrapper = makeWrapper();
    });
    it('make private button should open make private confirmation', () => {
      wrapper.find('[data-test="private"]').trigger('click');
      expect(wrapper.vm.makePrivateDialog).toBe(true);
    });
    it('confirm make private should call updateChannel with isPublic = false', () => {
      wrapper.find('[data-test="confirm-private"]').vm.$emit('confirm');
      expect(updateChannel).toHaveBeenCalledWith({ id: channelId, isPublic: false });
    });
  });
});
