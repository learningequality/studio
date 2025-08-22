import { mount } from '@vue/test-utils';
import StudioOfflineAlert from '../StudioOfflineAlert.vue';
import storeFactory from 'shared/vuex/baseStore';

function makeWrapper() {
  const store = storeFactory();
  return {
    wrapper: mount(StudioOfflineAlert, {
      store,
    }),
    store,
  };
}

describe('StudioOfflineAlert', () => {
  let wrapper, store;

  beforeEach(() => {
    const setup = makeWrapper();
    wrapper = setup.wrapper;
    store = setup.store;
  });

  it('displays alert component when offline', async () => {
    store.state.connection.online = false;
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-test="studio-offline-alert"]').exists()).toBe(true);
    expect(wrapper.text()).toMatch(
      'You seem to be offline. Your changes will be saved once your connection is back',
    );
  });

  it('hides alert component when online', async () => {
    store.state.connection.online = true;
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-test="studio-offline-alert"]').exists()).toBe(false);
  });
});
