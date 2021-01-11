import Vuex, { Store } from 'vuex';
import { mount, createLocalVue } from '@vue/test-utils';

import UsingStudio from '../UsingStudio/index';
import { policies } from 'shared/constants';

const localVue = createLocalVue();
localVue.use(Vuex);

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
    stubs: ['PolicyModals'],
  });
}

describe('usingStudio tab', () => {
  let wrapper;
  let openPolicy;

  beforeEach(() => {
    openPolicy = jest.fn();
    wrapper = makeWrapper({ methods: { openPolicy } });
  });

  it('clicking privacy link should open policies modal', () => {
    wrapper.find('[data-test="policy-link"]').trigger('click');
    expect(openPolicy).toHaveBeenCalledWith(policies.PRIVACY);
  });
  it('clicking terms of service link should open tos modal', () => {
    wrapper.find('[data-test="tos-link"]').trigger('click');
    expect(openPolicy).toHaveBeenCalledWith(policies.TERMS_OF_SERVICE);
  });
  it('clicking community standards link should open standards modal', () => {
    wrapper.find('[data-test="communitystandards-link"]').trigger('click');
    expect(openPolicy).toHaveBeenCalledWith(policies.COMMUNITY_STANDARDS);
  });
});
