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
  it('should show if connection is offline', () => {
    store.state.connection.online = false;
    expect(wrapper.find('[data-test="text"]').exists()).toBe(true);
  });
  it('should be hidden if connection is online', () => {
    store.state.connection.online = true;
    expect(wrapper.find('[data-test="text"]').exists()).toBe(false);
  });
});
