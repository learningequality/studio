import Vue from 'vue';
import { mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import store from '../../../store';
import router from '../../../router';
import { RouterNames, ListTypes } from '../../../constants';
import ChannelModal from '../ChannelModal.vue';
import { Channel } from 'shared/data/resources';

Vue.use(VueRouter);

const channelId = '11111111111111111111111111111111';

function makeWrapper(closeStub) {
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
    close: closeStub,
  });
  return wrapper;
}

describe('channelModal', () => {
  let wrapper;
  let closeStub;
  beforeEach(() => {
    return Channel.put({ name: 'test', deleted: false, edit: true, id: channelId, content_defaults: {} }).then(() => {
      closeStub = jest.fn();
      wrapper = makeWrapper(closeStub);
    });
  });
  it('clicking close should close the modal', () => {
    wrapper.find('[data-test="close"]').trigger('click');
    expect(closeStub).toHaveBeenCalled();
  });
});
