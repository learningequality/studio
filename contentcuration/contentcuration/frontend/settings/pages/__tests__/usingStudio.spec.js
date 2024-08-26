import Vuex, { Store } from 'vuex';
import VueRouter from 'vue-router';
import { mount, createLocalVue } from '@vue/test-utils';
import router from '../../../accounts/router';

import UsingStudio from '../UsingStudio/index';
import { policies } from 'shared/constants';

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);

jest.spyOn(router, 'push');

function makeWrapper({ methods = {} } = {}) {
  const store = new Store({
    modules: {
      policies: {
        namespaced: true,
        actions: {
          openPolicy: jest.fn(),
        },
      },
    },
  });
  return mount(UsingStudio, {
    localVue,
    store,
    methods,
    router,
    stubs: ['PolicyModals'],
  });
}

describe('usingStudio tab', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = makeWrapper();
  });

  it('clicking privacy link should open policies modal', () => {
    wrapper.find('[data-test="policy-link"]').trigger('click');
    const query = { query: { showPolicy: policies.PRIVACY } };
    expect(wrapper.vm.$router.push).toHaveBeenCalledWith(query);
  });
  it('clicking terms of service link should open tos modal', () => {
    wrapper.find('[data-test="tos-link"]').trigger('click');
    const query = { query: { showPolicy: policies.TERMS_OF_SERVICE } };
    expect(wrapper.vm.$router.push).toHaveBeenCalledWith(query);
  });
  it('clicking community standards link should open standards modal', () => {
    wrapper.find('[data-test="communitystandards-link"]').trigger('click');
    const query = { query: { showPolicy: policies.COMMUNITY_STANDARDS } };
    expect(wrapper.vm.$router.push).toHaveBeenCalledWith(query);
  });
});
