import { mount } from '@vue/test-utils';
import { Store } from 'vuex';
import EditAudienceModal from '../EditAudienceModal';
import { ResourcesNeededTypes } from 'shared/constants';
import { RolesNames } from 'shared/leUtils/Roles';

let nodes;

let store;
let contentNodeActions;
let generalActions;

const getRolesValues = wrapper => {
  const roles = {};
  const radioBtns = wrapper.findAll('[data-test="rol-radio-button"]');
  radioBtns.wrappers.forEach(checkbox => {
    const { buttonValue, currentValue } = checkbox.vm.$props || {};
    roles[buttonValue] = currentValue === buttonValue;
  });
  return roles;
};

const selectRole = (wrapper, rol) => {
  const radioBtn = wrapper.find(`[data-test="rol-radio-button"] input[value="${rol}"]`);
  radioBtn.setChecked(true);
};

const isForBeginnersChecked = wrapper => {
  return wrapper.find('[data-test="for-beginners-checkbox"] input').element.checked;
};

const checkForBeginners = wrapper => {
  wrapper.find('[data-test="for-beginners-checkbox"] input').setChecked(true);
};

const makeWrapper = nodeIds => {
  return mount(EditAudienceModal, {
    store,
    propsData: {
      nodeIds,
      resourcesSelectedText: '2 resources',
    },
  });
};

describe('EditAudienceModal', () => {
  beforeEach(() => {
    nodes = {
      node1: { id: 'node1' },
      node2: { id: 'node2' },
    };
    contentNodeActions = {
      updateContentNode: jest.fn(),
    };
    generalActions = {
      showSnackbarSimple: jest.fn(),
    };
    store = new Store({
      actions: generalActions,
      modules: {
        contentNode: {
          namespaced: true,
          actions: contentNodeActions,
          getters: {
            getContentNodes: () => ids => ids.map(id => nodes[id]),
          },
        },
      },
    });
  });

  test('smoke test', () => {
    const wrapper = makeWrapper(['node1']);
    expect(wrapper.isVueInstance()).toBe(true);
  });

  describe('Selected audience on first render', () => {
    test('no rol should be selected if a single node does not have set rol', () => {
      const wrapper = makeWrapper(['node1']);

      const rolesValues = getRolesValues(wrapper);
      Object.values(rolesValues).forEach(value => {
        expect(value).toBeFalsy();
      });
    });

    test('no rol should be selected if just a single node among multiple nodes does not have rol set', () => {
      nodes['node1'].role_visibility = RolesNames.COACH;

      const wrapper = makeWrapper(['node1', 'node2']);

      const rolesValues = getRolesValues(wrapper);
      Object.values(rolesValues).forEach(value => {
        expect(value).toBeFalsy();
      });
    });

    test('no rol should be selected if there are multiple roles set', () => {
      nodes['node1'].role_visibility = RolesNames.COACH;
      nodes['node2'].role_visibility = RolesNames.LEARNER;

      const wrapper = makeWrapper(['node1', 'node2']);

      const rolesValues = getRolesValues(wrapper);
      Object.values(rolesValues).forEach(value => {
        expect(value).toBeFalsy();
      });
    });

    test('the common rol should be selected if all nodes have the same rol visibility', () => {
      nodes['node1'].role_visibility = RolesNames.COACH;
      nodes['node2'].role_visibility = RolesNames.COACH;

      const wrapper = makeWrapper(['node1', 'node2']);

      const rolesValues = getRolesValues(wrapper);
      expect(rolesValues[RolesNames.COACH]).toBeTruthy();
    });

    test('for beginners checkbox should be unselected if no node is set for beginners', () => {
      const wrapper = makeWrapper(['node1']);

      expect(isForBeginnersChecked(wrapper)).toBeFalsy();
    });

    test('for beginners checkbox should be unselected if just a single node among multiple nodes is not set for beginners', () => {
      nodes['node1'].learner_needs = {
        [ResourcesNeededTypes.FOR_BEGINNERS]: true,
      };

      const wrapper = makeWrapper(['node1', 'node2']);

      expect(isForBeginnersChecked(wrapper)).toBeFalsy();
    });

    test('for beginners checkbox should be selected if all nodes are set for beginners', () => {
      nodes['node1'].learner_needs = {
        [ResourcesNeededTypes.FOR_BEGINNERS]: true,
      };
      nodes['node2'].learner_needs = {
        [ResourcesNeededTypes.FOR_BEGINNERS]: true,
      };

      const wrapper = makeWrapper(['node1', 'node2']);

      expect(isForBeginnersChecked(wrapper)).toBeTruthy();
    });

    test('should display information message about different roles visibilities if there are multiple roles set', () => {
      nodes['node1'].role_visibility = RolesNames.COACH;
      nodes['node2'].role_visibility = RolesNames.LEARNER;

      const wrapper = makeWrapper(['node1', 'node2']);

      expect(wrapper.find('[data-test="multiple-audience-message"]').exists()).toBeTruthy();
    });

    test('should not display information message about different roles visibilities if just some nodes are set for beginners', () => {
      nodes['node1'].learner_needs = {
        [ResourcesNeededTypes.FOR_BEGINNERS]: true,
      };

      const wrapper = makeWrapper(['node1', 'node2']);

      expect(wrapper.find('[data-test="multiple-audience-message"]').exists()).toBeTruthy();
    });

    test('should not display information message about different roles visibilities if all nodes have the same rol visibility and are set for beginners', () => {
      nodes['node1'].role_visibility = RolesNames.COACH;
      nodes['node1'].learner_needs = {
        [ResourcesNeededTypes.FOR_BEGINNERS]: true,
      };
      nodes['node2'].role_visibility = RolesNames.COACH;
      nodes['node2'].learner_needs = {
        [ResourcesNeededTypes.FOR_BEGINNERS]: true,
      };

      const wrapper = makeWrapper(['node1', 'node2']);

      expect(wrapper.find('[data-test="multiple-audience-message"]').exists()).toBeFalsy();
    });
  });

  test('should render the message of the number of resources selected', () => {
    const wrapper = makeWrapper(['node1', 'node2']);

    const resourcesCounter = wrapper.find('[data-test="resources-selected-message"]');
    expect(resourcesCounter.exists()).toBeTruthy();
    expect(resourcesCounter.text()).toContain('2');
  });

  test('should call updateContentNode with the right rol on success submit', () => {
    const wrapper = makeWrapper(['node1']);

    selectRole(wrapper, RolesNames.COACH);
    wrapper.find('[data-test="edit-audience-modal"]').vm.$emit('submit');

    const animationFrameId = requestAnimationFrame(() => {
      expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
        id: 'node1',
        role_visibility: RolesNames.COACH,
      });
      cancelAnimationFrame(animationFrameId);
    });
  });

  test('should call updateContentNode with the need for beginners set on success submit', () => {
    const wrapper = makeWrapper(['node1']);

    checkForBeginners(wrapper);
    wrapper.find('[data-test="edit-audience-modal"]').vm.$emit('submit');

    const animationFrameId = requestAnimationFrame(() => {
      expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
        id: 'node1',
        learner_needs: {
          [ResourcesNeededTypes.FOR_BEGINNERS]: true,
        },
      });
      cancelAnimationFrame(animationFrameId);
    });
  });

  test('should emit close event on success submit', () => {
    const wrapper = makeWrapper(['node1']);

    selectRole(wrapper, RolesNames.COACH);
    wrapper.find('[data-test="edit-audience-modal"]').vm.$emit('submit');

    const animationFrameId = requestAnimationFrame(() => {
      expect(wrapper.emitted('close')).toBeTruthy();
      cancelAnimationFrame(animationFrameId);
    });
  });

  test('should emit close event on cancel', () => {
    const wrapper = makeWrapper(['node1']);

    wrapper.find('[data-test="edit-audience-modal"]').vm.$emit('cancel');

    const animationFrameId = requestAnimationFrame(() => {
      expect(wrapper.emitted('close')).toBeTruthy();
      cancelAnimationFrame(animationFrameId);
    });
  });

  test('should show a confirmation snackbar on success submit', () => {
    const wrapper = makeWrapper(['node1']);

    selectRole(wrapper, RolesNames.COACH);
    wrapper.find('[data-test="edit-audience-modal"]').vm.$emit('submit');

    const animationFrameId = requestAnimationFrame(() => {
      expect(generalActions.showSnackbarSimple).toHaveBeenCalled();
      cancelAnimationFrame(animationFrameId);
    });
  });
});
