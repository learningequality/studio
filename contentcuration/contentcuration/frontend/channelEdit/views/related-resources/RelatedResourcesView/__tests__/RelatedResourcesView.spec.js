import { mount, createLocalVue } from '@vue/test-utils';
import Vuex, { Store } from 'vuex';
import VueRouter from 'vue-router';

import RelatedResourcesView from '../RelatedResourcesView';

const localVue = createLocalVue();
localVue.use(Vuex);

localVue.use(VueRouter);

const NODE_ID = 'id-reading';

const GETTERS = {
  getContentNode: () => jest.fn(),
  getImmediatePreviousStepsList: () => jest.fn(),
  getImmediateNextStepsList: () => jest.fn(),
};

const initWrapper = ({ getters = GETTERS } = {}) => {
  const router = new VueRouter();
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
      nodeId: NODE_ID,
    },
    localVue,
    router,
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

  it('renders all previous steps', () => {
    const getters = {
      ...GETTERS,
      getImmediatePreviousStepsList: () => () => [
        {
          id: 'id-alphabet',
          title: 'Alphabet',
          kind: 'document',
          parentTitle: 'Literacy',
        },
      ],
    };
    const wrapper = initWrapper({ getters });

    const previousSteps = wrapper
      .find('[data-test="previousSteps"]')
      .findAll('[data-test="resource"]');

    expect(previousSteps.length).toBe(1);

    expect(previousSteps.at(0).html()).toContain('Alphabet');
    expect(previousSteps.at(0).html()).toContain('Literacy');
  });

  it('renders all next steps', () => {
    const getters = {
      ...GETTERS,
      getImmediateNextStepsList: () => () => [
        {
          id: 'id-counting',
          title: 'Counting',
          kind: 'video',
          parentTitle: 'Science',
        },
        {
          id: 'id-geography',
          title: 'Geography',
          kind: 'document',
          parentTitle: 'Science',
        },
      ],
    };
    const wrapper = initWrapper({ getters });

    const nextSteps = wrapper.find('[data-test="nextSteps"]').findAll('[data-test="resource"]');

    expect(nextSteps.length).toBe(2);

    expect(nextSteps.at(0).html()).toContain('Counting');
    expect(nextSteps.at(0).html()).toContain('Science');

    expect(nextSteps.at(1).html()).toContain('Geography');
    expect(nextSteps.at(1).html()).toContain('Science');
  });
});
