import Vuex from 'vuex';
import { mount } from '@vue/test-utils';
import EditResourcesNeededModal from '../EditResourcesNeededModal';
import { ResourcesNeededTypes } from 'shared/constants';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

let nodes;

let store;
let contentNodeActions;
let generalActions;

const makeWrapper = nodeIds => {
  return mount(EditResourcesNeededModal, {
    store,
    propsData: {
      nodeIds,
    },
    methods: {
      translateMetadataString: value => {
        return value;
      },
    },
  });
};

const CheckboxValue = {
  UNCHECKED: 'UNCHECKED',
  CHECKED: 'CHECKED',
  INDETERMINATE: 'INDETERMINATE',
};

const resourcesLookup = {};
Object.entries(ResourcesNeededTypes).forEach(([key, value]) => {
  resourcesLookup[key] = value;
});

const getResourcesValues = wrapper => {
  const resources = {};
  const checkboxes = wrapper.findAll('[data-test="resource-checkbox"]');
  checkboxes.wrappers.forEach(checkbox => {
    const { label, checked, indeterminate } = checkbox.vm.$props || {};
    let value;
    if (indeterminate) {
      value = CheckboxValue.INDETERMINATE;
    } else if (checked) {
      value = CheckboxValue.CHECKED;
    } else {
      value = CheckboxValue.UNCHECKED;
    }
    resources[resourcesLookup[label]] = value;
  });
  return resources;
};

const findResourceCheckbox = (wrapper, resource) => {
  const checkboxes = wrapper.findAll('[data-test="resource-checkbox"]');
  return checkboxes.wrappers.find(checkbox => {
    const { label } = checkbox.vm.$props || {};
    return resourcesLookup[label] === resource;
  });
};

describe('EditResourcesNeededModal', () => {
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
    store = new Vuex.Store({
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

  describe('Selected resources on first render', () => {
    test('no resource should be selected if a single node does not have needed resources set', () => {
      const wrapper = makeWrapper(['node1']);

      const resourcesValues = getResourcesValues(wrapper);
      expect(
        Object.values(resourcesValues).every(value => value === CheckboxValue.UNCHECKED)
      ).toBeTruthy();
    });

    test('specific resources should be selected depending on the learner needs set for a single node', () => {
      nodes['node1'].learner_needs = {
        [ResourcesNeededTypes.INTERNET]: true,
        [ResourcesNeededTypes.PEERS]: true,
      };

      const wrapper = makeWrapper(['node1']);

      const resourcesValues = getResourcesValues(wrapper);
      const {
        [ResourcesNeededTypes.INTERNET]: internetValue,
        [ResourcesNeededTypes.PEERS]: peersValue,
        ...otherResourcesValues
      } = resourcesValues;
      expect(
        Object.values(otherResourcesValues).every(value => value === CheckboxValue.UNCHECKED)
      ).toBeTruthy();
      expect(internetValue).toBe(CheckboxValue.CHECKED);
      expect(peersValue).toBe(CheckboxValue.CHECKED);
    });

    test('checkbox resource should be checked if all nodes have the same resources needed set', () => {
      nodes['node1'].learner_needs = {
        [ResourcesNeededTypes.INTERNET]: true,
        [ResourcesNeededTypes.PEERS]: true,
      };
      nodes['node2'].learner_needs = {
        [ResourcesNeededTypes.INTERNET]: true,
        [ResourcesNeededTypes.PEERS]: true,
      };

      const wrapper = makeWrapper(['node1', 'node2']);

      const resourcesValues = getResourcesValues(wrapper);
      const {
        [ResourcesNeededTypes.INTERNET]: internetValue,
        [ResourcesNeededTypes.PEERS]: peersValue,
      } = resourcesValues;
      expect(internetValue).toBe(CheckboxValue.CHECKED);
      expect(peersValue).toBe(CheckboxValue.CHECKED);
    });

    test('checkbox resource should be indeterminate if not all nodes have the same learner needs set', () => {
      nodes['node1'].learner_needs = {
        [ResourcesNeededTypes.INTERNET]: true,
      };

      const wrapper = makeWrapper(['node1', 'node2']);

      const resourcesValues = getResourcesValues(wrapper);
      const { [ResourcesNeededTypes.INTERNET]: internetValue } = resourcesValues;
      expect(internetValue).toBe(CheckboxValue.INDETERMINATE);
    });
  });

  test('should render the message of the number of resources selected', () => {
    const wrapper = makeWrapper(['node1', 'node2']);

    const resourcesCounter = wrapper.find('[data-test="resources-selected-message"]');
    expect(resourcesCounter.exists()).toBeTruthy();
    expect(resourcesCounter.text()).toContain('2');
  });

  test('should call updateContentNode with the right resources on submit', () => {
    const wrapper = makeWrapper(['node1', 'node2']);

    const peersCheckbox = findResourceCheckbox(wrapper, ResourcesNeededTypes.PEERS);
    peersCheckbox.element.click();
    const internetCheckbox = findResourceCheckbox(wrapper, ResourcesNeededTypes.INTERNET);
    internetCheckbox.element.click();

    const animationFrameId = requestAnimationFrame(() => {
      wrapper.find('[data-test="edit-resources-needed-modal"]').vm.$emit('submit');
      expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
        id: 'node1',
        learner_needs: {
          [ResourcesNeededTypes.PEERS]: true,
          [ResourcesNeededTypes.INTERNET]: true,
        },
      });
      expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
        id: 'node2',
        learner_needs: {
          [ResourcesNeededTypes.PEERS]: true,
          [ResourcesNeededTypes.INTERNET]: true,
        },
      });
      cancelAnimationFrame(animationFrameId);
    });
  });

  test('should emit close event on success submit', () => {
    const wrapper = makeWrapper(['node1']);

    wrapper.find('[data-test="edit-resources-needed-modal"]').vm.$emit('submit');

    const animationFrameId = requestAnimationFrame(() => {
      expect(wrapper.emitted('close')).toBeTruthy();
      cancelAnimationFrame(animationFrameId);
    });
  });

  test('should emit close event on cancel', () => {
    const wrapper = makeWrapper(['node1']);

    wrapper.find('[data-test="edit-resources-needed-modal"]').vm.$emit('cancel');

    const animationFrameId = requestAnimationFrame(() => {
      expect(wrapper.emitted('close')).toBeTruthy();
      cancelAnimationFrame(animationFrameId);
    });
  });

  test('should show a confirmation snackbar on success submit', () => {
    const wrapper = makeWrapper(['node1']);

    wrapper.find('[data-test="edit-resources-needed-modal"]').vm.$emit('submit');

    const animationFrameId = requestAnimationFrame(() => {
      expect(generalActions.showSnackbarSimple).toHaveBeenCalled();
      cancelAnimationFrame(animationFrameId);
    });
  });

  describe('topic nodes present', () => {
    test('should display the checkbox to apply change to descendants if a topic is present', () => {
      nodes['node1'].kind = ContentKindsNames.TOPIC;

      const wrapper = makeWrapper(['node1', 'node2']);

      expect(wrapper.find('[data-test="update-descendants-checkbox"]').exists()).toBeTruthy();
    });

    test('should not display the checkbox to apply change to descendants if a topic is not present', () => {
      const wrapper = makeWrapper(['node1', 'node2']);

      expect(wrapper.find('[data-test="update-descendants-checkbox"]').exists()).toBeFalsy();
    });

    test('should call updateContentNode on success submit if the user does not check the checkbox', () => {
      nodes['node1'].kind = ContentKindsNames.TOPIC;

      const wrapper = makeWrapper(['node1']);

      wrapper.find('[data-test="edit-resources-needed-modal"]').vm.$emit('submit');

      const animationFrameId = requestAnimationFrame(() => {
        expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
          id: 'node1',
          learner_needs: {},
        });
        cancelAnimationFrame(animationFrameId);
      });
    });

    test('should call updateContentNode on success submit if the user checks the checkbox', () => {
      nodes['node1'].kind = ContentKindsNames.TOPIC;

      const wrapper = makeWrapper(['node1']);

      wrapper.find('[data-test="update-descendants-checkbox"] input').setChecked(true);
      wrapper.find('[data-test="edit-resources-needed-modal"]').vm.$emit('submit');

      const animationFrameId = requestAnimationFrame(() => {
        expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
          id: 'node1',
          learner_needs: {},
        });
        cancelAnimationFrame(animationFrameId);
      });
    });
  });
});
