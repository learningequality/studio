import { mount } from '@vue/test-utils';
import { factory } from '../../../store';
import router from '../../../router';
import { RouteNames } from '../../../constants';
import ChannelSetList from '../ChannelSetList.vue';

const store = factory();

const id = '00000000000000000000000000000000';

function makeWrapper(createChannelSetStub) {
  router.push({
    name: RouteNames.CHANNEL_SETS,
  });
  const wrapper = mount(ChannelSetList, { store, router });
  wrapper.setMethods({
    createChannelSet: createChannelSetStub,
  });
  return wrapper;
}

describe('channelSetList', () => {
  let wrapper;
  const createChannelSetStub = jest.fn().mockImplementation(() => Promise.resolve(id));
  beforeEach(() => {
    wrapper = makeWrapper(createChannelSetStub);
      wrapper.setData({ loading: false });
   
  });
  it('should open a new channel set modal when new set button is clicked', async () => {
      const push = jest.fn();
      wrapper.vm.$router.push = push;
      await wrapper.find('[data-test="add-channelset"]').trigger('click');
      expect(push).toHaveBeenCalledWith({
        name: RouteNames.NEW_CHANNEL_SET_DETAILS,
      });
    });
    
  
});
