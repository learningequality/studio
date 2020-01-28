import Vue from 'vue';
import { mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import store from '../../../store';
import router from '../../../router';
import { RouterNames, ListTypes } from '../../../constants';
import ChannelModal from '../ChannelModal.vue';

Vue.use(VueRouter);

const channelId = 'testing';

function makeWrapper(saveStub, closeStub) {
  router.push({
    name: RouterNames.CHANNEL_EDIT,
    params: {
      channelId: channelId,
      listType: ListTypes.EDITABLE,
    },
  });
  let wrapper = mount(ChannelModal, {
    router,
    store,
    propsData: {
      channelId: channelId,
    },
  });
  wrapper.setMethods({
    save: saveStub,
    close: closeStub,
  });
  return wrapper;
}

describe('channelModal', () => {
  let wrapper;
  let saveStub = jest.fn();
  let closeStub = jest.fn();
  beforeEach(() => {
    saveStub.mockReset();
    closeStub.mockReset();
    wrapper = makeWrapper(saveStub, closeStub);
  });
  it('clicking close should close the modal', () => {
    wrapper.find('[data-test="close"]').trigger('click');
    expect(closeStub).toHaveBeenCalled();
  });
  it('clicking save button should save and close the modal', () => {
    wrapper.find('[data-test="save"]').trigger('click');
    expect(saveStub).toHaveBeenCalled();
  });
});
