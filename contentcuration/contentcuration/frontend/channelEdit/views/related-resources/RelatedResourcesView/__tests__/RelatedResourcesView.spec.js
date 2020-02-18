import { mount, createLocalVue } from '@vue/test-utils';
import Vuex, { Store } from 'vuex';

import RelatedResourcesView from '../RelatedResourcesView';

const localVue = createLocalVue();
localVue.use(Vuex);

const GETTERS = {
  getContentNode: () => jest.fn(),
};

const initWrapper = ({ getters = GETTERS } = {}) => {
  const store = new Store({
    modules: {
      contentNode: {
        namespaced: true,
        getters,
      },
    },
  });

  return mount(RelatedResourcesView, {
    propsData: {
      nodeId: 'id-reading',
    },
    localVue,
    store,
  });
};

describe('RelatedResourcesView', () => {
  it('renders a title of a selected node', () => {
    const getters = {
      ...GETTERS,
      getContentNode: () => () => {
        return {
          title: 'Reading',
        };
      },
    };

    const wrapper = initWrapper({ getters });

    expect(wrapper.find('[data-test="title"]').html()).toContain('Reading');
  });
});
