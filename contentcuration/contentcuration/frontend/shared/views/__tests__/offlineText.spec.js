import { mount } from '@vue/test-utils';
import OfflineText from '../OfflineText';
import storeFactory from 'shared/vuex/baseStore';

const store = storeFactory();
function makeWrapper() {
  return mount(OfflineText, {
    store,
  });
}

describe('offlineText', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  it('should show if connection is offline', async () => {
    store.state.connection.online = false;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-test="fallback"]').exists()).toBe(true);
  });
  it('should be hidden if connection is online', async () => {
    store.state.connection.online = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-test="fallback"]').exists()).toBe(false);
  });
});
