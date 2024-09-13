import Vuex from 'vuex';
import { mount } from '@vue/test-utils';
import camelCase from 'lodash/camelCase';
import EditBooleanMapModal from '../EditBooleanMapModal';
import { metadataTranslationMixin } from 'shared/mixins';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
import { Categories } from 'shared/constants';
import CategoryOptions from 'shared/views/contentNodeFields/CategoryOptions';

let nodes;

let store;
let contentNodeActions;
let generalActions;

const CheckboxValue = {
  UNCHECKED: 'UNCHECKED',
  CHECKED: 'CHECKED',
  INDETERMINATE: 'INDETERMINATE',
};

const { translateMetadataString } = metadataTranslationMixin.methods;

const categoriesLookup = {};
Object.entries(Categories).forEach(([key, value]) => {
  const newKey = translateMetadataString(camelCase(key));
  categoriesLookup[newKey] = value;
});

const getOptionsValues = wrapper => {
  const categories = {};
  const checkboxes = wrapper.findAll('[data-test="option-checkbox"]');
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
    categories[categoriesLookup[label]] = value;
  });
  return categories;
};

const findOptionCheckbox = (wrapper, category) => {
  const checkboxes = wrapper.findAll('[data-test="option-checkbox"]');
  return checkboxes.wrappers.find(checkbox => {
    const { label } = checkbox.vm.$props || {};
    return categoriesLookup[label] === category;
  });
};

const options = Object.entries(Categories).map(([key, value]) => {
  return {
    label: key,
    value,
  };
});
const makeWrapper = ({ nodeIds, field = 'categories', ...restOptions }) => {
  return mount(EditBooleanMapModal, {
    store,
    propsData: {
      nodeIds,
      options,
      title: 'Edit categories',
      field,
      autocompleteLabel: 'Select option',
      confirmationMessage: 'edited',
      resourcesSelectedText: '2 resources',
      ...restOptions,
    },
    scopedSlots: {
      input: function(props) {
        return this.$createElement(CategoryOptions, {
          props: {
            ...props,
            expanded: true,
            hideLabel: true,
            nodeIds,
          },
        });
      },
    },
  });
};

describe('EditBooleanMapModal', () => {
  beforeEach(() => {
    nodes = {
      node1: { id: 'node1' },
      node2: { id: 'node2' },
      node3: { id: 'node3' },
      node4: { id: 'node4' },
    };
    contentNodeActions = {
      updateContentNode: jest.fn(),
      updateContentNodeDescendants: jest.fn(),
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
    const wrapper = makeWrapper({ nodeIds: ['node1'] });
    expect(wrapper.isVueInstance()).toBe(true);
  });

  describe('Selected options on first render', () => {
    describe('Options checkboxes', () => {
      test('no option should be selected if a single node does not have options set', () => {
        const wrapper = makeWrapper({ nodeIds: ['node1'] });

        const optionsValues = getOptionsValues(wrapper);
        expect(
          Object.values(optionsValues).every(value => value === CheckboxValue.UNCHECKED)
        ).toBeTruthy();
      });

      test('no option should be selected if multiple nodes dont have options set', () => {
        const wrapper = makeWrapper({ nodeIds: ['node1', 'node2'] });

        const optionsValues = getOptionsValues(wrapper);
        expect(
          Object.values(optionsValues).every(value => value === CheckboxValue.UNCHECKED)
        ).toBeTruthy();
      });

      test('checkbox options should be selected depending on the options set for a single node - categories', () => {
        nodes['node1'].categories = {
          [Categories.DAILY_LIFE]: true,
          [Categories.FOUNDATIONS]: true,
        };

        const wrapper = makeWrapper({ nodeIds: ['node1'] });

        const optionsValues = getOptionsValues(wrapper);
        const {
          [Categories.DAILY_LIFE]: dailyLifeValue,
          [Categories.FOUNDATIONS]: foundationsValue,
          ...otheroptionsValues
        } = optionsValues;
        expect(
          Object.values(otheroptionsValues).every(value => value === CheckboxValue.UNCHECKED)
        ).toBeTruthy();
        expect(dailyLifeValue).toBe(CheckboxValue.CHECKED);
        expect(foundationsValue).toBe(CheckboxValue.CHECKED);
      });

      test('checkbox option should be checked if all nodes have the same option set', () => {
        nodes['node1'].categories = {
          [Categories.DAILY_LIFE]: true,
          [Categories.FOUNDATIONS]: true,
        };
        nodes['node2'].categories = {
          [Categories.DAILY_LIFE]: true,
          [Categories.FOUNDATIONS]: true,
        };

        const wrapper = makeWrapper({ nodeIds: ['node1', 'node2'] });

        const optionsValues = getOptionsValues(wrapper);
        const {
          [Categories.DAILY_LIFE]: dailyLifeValue,
          [Categories.FOUNDATIONS]: foundationsValue,
        } = optionsValues;
        expect(dailyLifeValue).toBe(CheckboxValue.CHECKED);
        expect(foundationsValue).toBe(CheckboxValue.CHECKED);
      });

      test('checkbox option should be indeterminate if not all nodes have the same options set', () => {
        nodes['node1'].categories = {
          [Categories.DAILY_LIFE]: true,
          [Categories.FOUNDATIONS]: true,
        };
        nodes['node2'].categories = {
          [Categories.DAILY_LIFE]: true,
        };

        const wrapper = makeWrapper({ nodeIds: ['node1', 'node2'] });

        const optionsValues = getOptionsValues(wrapper);
        const {
          [Categories.DAILY_LIFE]: dailyLifeValue,
          [Categories.FOUNDATIONS]: foundationsValue,
        } = optionsValues;
        expect(dailyLifeValue).toBe(CheckboxValue.CHECKED);
        expect(foundationsValue).toBe(CheckboxValue.INDETERMINATE);
      });
    });
  });

  test('should render the message of the number of resources selected', () => {
    const wrapper = makeWrapper({ nodeIds: ['node1', 'node2'] });

    const resourcesCounter = wrapper.find('[data-test="resources-selected-message"]');
    expect(resourcesCounter.exists()).toBeTruthy();
    expect(resourcesCounter.text()).toContain('2');
  });

  test('should render the message of the number of resources selected - 2', () => {
    const wrapper = makeWrapper({ nodeIds: ['node1', 'node2', 'node3', 'node4'] });

    const resourcesCounter = wrapper.find('[data-test="resources-selected-message"]');
    expect(resourcesCounter.exists()).toBeTruthy();
    expect(resourcesCounter.text()).toContain('2 resources');
  });

  describe('Submit', () => {
    test('should call updateContentNode with the right options on success submit - categories', () => {
      const wrapper = makeWrapper({ nodeIds: ['node1', 'node2'] });

      const schoolCheckbox = findOptionCheckbox(wrapper, Categories.SCHOOL);
      schoolCheckbox.element.click();
      const sociologyCheckbox = findOptionCheckbox(wrapper, Categories.SOCIOLOGY);
      sociologyCheckbox.element.click();

      const animationFrameId = requestAnimationFrame(() => {
        wrapper.find('[data-test="edit-booleanMap-modal"]').vm.$emit('submit');
        expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
          id: 'node1',
          categories: {
            [Categories.SCHOOL]: true,
            [Categories.SOCIOLOGY]: true,
          },
        });
        expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
          id: 'node2',
          categories: {
            [Categories.SCHOOL]: true,
            [Categories.SOCIOLOGY]: true,
          },
        });
        cancelAnimationFrame(animationFrameId);
      });
    });

    test('should emit close event on success submit', () => {
      const wrapper = makeWrapper({ nodeIds: ['node1'] });

      wrapper.find('[data-test="edit-booleanMap-modal"]').vm.$emit('submit');

      const animationFrameId = requestAnimationFrame(() => {
        expect(wrapper.emitted('close')).toBeTruthy();
        cancelAnimationFrame(animationFrameId);
      });
    });

    test('should show a confirmation snackbar on success submit', () => {
      const wrapper = makeWrapper({ nodeIds: ['node1'] });

      wrapper.find('[data-test="edit-booleanMap-modal"]').vm.$emit('submit');

      const animationFrameId = requestAnimationFrame(() => {
        expect(generalActions.showSnackbarSimple).toHaveBeenCalled();
        cancelAnimationFrame(animationFrameId);
      });
    });
  });

  test('should emit close event on cancel', () => {
    const wrapper = makeWrapper({ nodeIds: ['node1'] });

    wrapper.find('[data-test="edit-booleanMap-modal"]').vm.$emit('cancel');

    const animationFrameId = requestAnimationFrame(() => {
      expect(wrapper.emitted('close')).toBeTruthy();
      cancelAnimationFrame(animationFrameId);
    });
  });

  describe('topic nodes present', () => {
    test('should display the checkbox to apply change to descendants if a topic is present and is descendants updatable', () => {
      nodes['node1'].kind = ContentKindsNames.TOPIC;

      const wrapper = makeWrapper({ nodeIds: ['node1', 'node2'], isDescendantsUpdatable: true });

      expect(wrapper.find('[data-test="update-descendants-checkbox"]').exists()).toBeTruthy();
    });

    test('should not display the checkbox to apply change to descendants if a topic is not present even though its descendants updatable', () => {
      const wrapper = makeWrapper({ nodeIds: ['node1', 'node2'], isDescendantsUpdatable: true });

      expect(wrapper.find('[data-test="update-descendants-checkbox"]').exists()).toBeFalsy();
    });

    test('should not display the checkbox to apply change to descendants if is not descendants updatable', () => {
      nodes['node1'].kind = ContentKindsNames.TOPIC;

      const wrapper = makeWrapper({ nodeIds: ['node1', 'node2'], isDescendantsUpdatable: false });

      expect(wrapper.find('[data-test="update-descendants-checkbox"]').exists()).toBeFalsy();
    });

    test('should call updateContentNode on success submit if the user does not check the update descendants checkbox', () => {
      nodes['node1'].kind = ContentKindsNames.TOPIC;

      const wrapper = makeWrapper({ nodeIds: ['node1'], isDescendantsUpdatable: true });

      wrapper.find('[data-test="edit-booleanMap-modal"]').vm.$emit('submit');

      const animationFrameId = requestAnimationFrame(() => {
        expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
          id: 'node1',
          categories: {},
        });
        cancelAnimationFrame(animationFrameId);
      });
    });

    test('should call updateContentNodeDescendants on success submit if the user checks the descendants checkbox', () => {
      nodes['node1'].kind = ContentKindsNames.TOPIC;

      const wrapper = makeWrapper({ nodeIds: ['node1'], isDescendantsUpdatable: true });

      wrapper.find('[data-test="update-descendants-checkbox"] input').setChecked(true);
      wrapper.find('[data-test="edit-booleanMap-modal"]').vm.$emit('submit');

      const animationFrameId = requestAnimationFrame(() => {
        expect(contentNodeActions.updateContentNodeDescendants).toHaveBeenCalledWith(
          expect.anything(),
          {
            id: 'node1',
            categories: {},
          }
        );
        cancelAnimationFrame(animationFrameId);
      });
    });
  });
});
