import { mount, createLocalVue } from '@vue/test-utils';
import Vuex, { Store } from 'vuex';
import VueRouter from 'vue-router';

import RelatedResourcesTab from './RelatedResourcesTab';

const localVue = createLocalVue();
localVue.use(Vuex);

localVue.use(VueRouter);

const NODE_ID = 'id-reading';

const GETTERS = {
  getContentNode: () => jest.fn(),
  getImmediatePreviousStepsList: () => jest.fn(),
  getImmediateNextStepsList: () => jest.fn(),
};

const ACTIONS = {
  removePreviousStepFromNode: () => jest.fn(),
  removeNextStepFromNode: () => jest.fn(),
};

const initWrapper = ({ getters = GETTERS, actions = ACTIONS } = {}) => {
  const router = new VueRouter();
  const store = new Store({
    modules: {
      contentNode: {
        namespaced: true,
        getters,
        actions,
      },
    },
  });

  return mount(RelatedResourcesTab, {
    propsData: {
      nodeId: NODE_ID,
    },
    localVue,
    router,
    store,
  });
};

describe('RelatedResourcesTab', () => {
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

  describe('with less than 5 previous steps', () => {
    it('does not render a warning', () => {
      const getters = {
        ...GETTERS,
        getImmediatePreviousStepsList: () => () => [
          { id: 'id-alphabet' },
          { id: 'id-chemistry' },
          { id: 'id-biology' },
          { id: 'id-physics' },
        ],
      };
      const wrapper = initWrapper({ getters });

      expect(wrapper.find('[data-test="previousSteps"]').html()).not.toContain(
        'Limit the number of previous steps',
      );
    });
  });

  describe('with 5 previous steps and more', () => {
    it('renders a warning', () => {
      const getters = {
        ...GETTERS,
        getImmediatePreviousStepsList: () => () => [
          { id: 'id-alphabet' },
          { id: 'id-chemistry' },
          { id: 'id-biology' },
          { id: 'id-physics' },
          { id: 'id-math' },
          { id: 'id-reading' },
        ],
      };
      const wrapper = initWrapper({ getters });

      expect(wrapper.find('[data-test="previousSteps"]').html()).toContain(
        'Limit the number of previous steps',
      );
    });
  });

  describe('with less than 5 next steps', () => {
    it('does not render a warning', () => {
      const getters = {
        ...GETTERS,
        getImmediateNextStepsList: () => () => [
          { id: 'id-alphabet' },
          { id: 'id-chemistry' },
          { id: 'id-biology' },
          { id: 'id-physics' },
        ],
      };
      const wrapper = initWrapper({ getters });

      expect(wrapper.find('[data-test="nextSteps"]').html()).not.toContain(
        'Limit the number of next steps',
      );
    });
  });

  describe('with 5 next steps and more', () => {
    it('renders a warning', () => {
      const getters = {
        ...GETTERS,
        getImmediateNextStepsList: () => () => [
          { id: 'id-alphabet' },
          { id: 'id-chemistry' },
          { id: 'id-biology' },
          { id: 'id-physics' },
          { id: 'id-math' },
          { id: 'id-reading' },
        ],
      };
      const wrapper = initWrapper({ getters });

      expect(wrapper.find('[data-test="nextSteps"]').html()).toContain(
        'Limit the number of next steps',
      );
    });
  });

  describe('on remove previous step button click', () => {
    it('dispatches remove previous step action with correct nodes ids', () => {
      const getters = {
        ...GETTERS,
        getImmediatePreviousStepsList: () => () => [{ id: 'id-counting' }, { id: 'id-chemistry' }],
      };

      const mockRemovePreviousStepFromNode = jest.fn();
      const actions = {
        ...ACTIONS,
        removePreviousStepFromNode: mockRemovePreviousStepFromNode,
      };

      const wrapper = initWrapper({ getters, actions });

      wrapper
        .find('[data-test="previousSteps"]')
        .findAll('[data-test="resourceRemoveBtn"]')
        .at(1)
        .trigger('click');

      expect(mockRemovePreviousStepFromNode.mock.calls.length).toBe(1);
      expect(mockRemovePreviousStepFromNode.mock.calls[0][1]).toEqual({
        targetId: 'id-reading',
        previousStepId: 'id-chemistry',
      });
    });
  });

  describe('on remove next step button click', () => {
    it('dispatches next previous step action with correct nodes ids', () => {
      const getters = {
        ...GETTERS,
        getImmediateNextStepsList: () => () => [{ id: 'id-counting' }, { id: 'id-chemistry' }],
      };

      const mockRemoveNextStepFromNode = jest.fn();
      const actions = {
        ...ACTIONS,
        removeNextStepFromNode: mockRemoveNextStepFromNode,
      };

      const wrapper = initWrapper({ getters, actions });

      wrapper
        .find('[data-test="nextSteps"]')
        .findAll('[data-test="resourceRemoveBtn"]')
        .at(1)
        .trigger('click');

      expect(mockRemoveNextStepFromNode.mock.calls.length).toBe(1);
      expect(mockRemoveNextStepFromNode.mock.calls[0][1]).toEqual({
        targetId: 'id-reading',
        nextStepId: 'id-chemistry',
      });
    });
  });
});
