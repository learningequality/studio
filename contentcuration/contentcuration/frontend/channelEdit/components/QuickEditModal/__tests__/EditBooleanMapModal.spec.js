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
    const { label, checked } = checkbox.vm.$props || {};
    let value;
    if (checked) {
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
          on: {
            input(value) {
              props.inputHandler(value);
            },
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
            getContentNode: () => id => nodes[id],
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
    test('should call updateContentNode with the selected options on an empty boolean map when success submit', async () => {
      const wrapper = makeWrapper({ nodeIds: ['node1', 'node2'] });

      const schoolCheckbox = findOptionCheckbox(wrapper, Categories.SCHOOL);
      schoolCheckbox.element.click();
      const sociologyCheckbox = findOptionCheckbox(wrapper, Categories.SOCIOLOGY);
      sociologyCheckbox.element.click();

      await wrapper.vm.handleSave();
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
    });

    test('should emit close event on success submit', async () => {
      const wrapper = makeWrapper({ nodeIds: ['node1'] });

      await wrapper.vm.handleSave();
      expect(wrapper.emitted('close')).toBeTruthy();
    });

    test('should show a confirmation snackbar on success submit', async () => {
      const wrapper = makeWrapper({ nodeIds: ['node1'] });

      await wrapper.vm.handleSave();
      expect(generalActions.showSnackbarSimple).toHaveBeenCalled();
    });
  });

  test('should emit close event on cancel', () => {
    const wrapper = makeWrapper({ nodeIds: ['node1'] });

    wrapper.vm.close();
    expect(wrapper.emitted('close')).toBeTruthy();
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

    test('should call updateContentNode on success submit if the user does not check the update descendants checkbox', async () => {
      nodes['node1'].kind = ContentKindsNames.TOPIC;

      const wrapper = makeWrapper({ nodeIds: ['node1'], isDescendantsUpdatable: true });
      await wrapper.vm.handleSave();

      expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
        id: 'node1',
        categories: {},
      });
    });

    test('should call updateContentNodeDescendants on success submit if the user checks the descendants checkbox', async () => {
      nodes['node1'].kind = ContentKindsNames.TOPIC;

      const wrapper = makeWrapper({ nodeIds: ['node1'], isDescendantsUpdatable: true });
      wrapper.find('[data-test="update-descendants-checkbox"]').element.click();
      await wrapper.vm.handleSave();

      expect(contentNodeActions.updateContentNodeDescendants).toHaveBeenCalledWith(
        expect.anything(),
        {
          id: 'node1',
          categories: {},
        }
      );
    });
  });

  describe('mixed options that are not selected across all nodes', () => {
    describe('render mixed options message', () => {
      test('should not render mixed options message if there are not mixed options across selected nodes', () => {
        const wrapper = makeWrapper({ nodeIds: ['node1', 'node2'] });

        expect(wrapper.find('[data-test="mixed-categories-message"]').exists()).toBeFalsy();
      });

      test('should not render mixed options message if there are not mixed options across selected nodes - 2', () => {
        nodes['node1'].categories = {
          [Categories.DAILY_LIFE]: true,
          [Categories.FOUNDATIONS]: true,
        };
        nodes['node2'].categories = {
          [Categories.DAILY_LIFE]: true,
          [Categories.FOUNDATIONS]: true,
        };
        const wrapper = makeWrapper({ nodeIds: ['node1', 'node2'] });

        expect(wrapper.find('[data-test="mixed-categories-message"]').exists()).toBeFalsy();
      });

      test('should render mixed options message if there are mixed options across selected nodes', () => {
        nodes['node1'].categories = {
          [Categories.DAILY_LIFE]: true,
        };
        nodes['node2'].categories = {};
        const wrapper = makeWrapper({ nodeIds: ['node1', 'node2'] });

        expect(wrapper.find('[data-test="mixed-categories-message"]').exists()).toBeTruthy();
      });

      test('should render mixed options message if there are mixed options across selected nodes - 2', () => {
        nodes['node1'].categories = {
          [Categories.DAILY_LIFE]: true,
        };
        nodes['node2'].categories = {
          [Categories.DAILY_LIFE]: true,
          [Categories.FOUNDATIONS]: true,
        };
        const wrapper = makeWrapper({ nodeIds: ['node1', 'node2'] });

        expect(wrapper.find('[data-test="mixed-categories-message"]').exists()).toBeTruthy();
      });
    });
    describe('on submit', () => {
      test('should add new selected options on submit even if there are not common selected options', () => {
        nodes['node1'].categories = {
          [Categories.DAILY_LIFE]: true,
        };
        nodes['node2'].categories = {
          [Categories.FOUNDATIONS]: true,
        };
        const wrapper = makeWrapper({ nodeIds: ['node1', 'node2'] });

        const schoolCheckbox = findOptionCheckbox(wrapper, Categories.SCHOOL);
        schoolCheckbox.element.click();

        wrapper.vm.handleSave();

        expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
          id: 'node1',
          categories: {
            // already daily_life category selected plus new school category selected
            [Categories.SCHOOL]: true,
            [Categories.DAILY_LIFE]: true,
          },
        });
        expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
          id: 'node2',
          categories: {
            // already foundations category selected plus new school category selected
            [Categories.SCHOOL]: true,
            [Categories.FOUNDATIONS]: true,
          },
        });
      });

      test('should add new selected options on submit even if there are common selected options', () => {
        nodes['node1'].categories = {
          [Categories.DAILY_LIFE]: true,
          [Categories.FOUNDATIONS]: true,
        };
        nodes['node2'].categories = {
          [Categories.FOUNDATIONS]: true,
        };
        const wrapper = makeWrapper({ nodeIds: ['node1', 'node2'] });

        const schoolCheckbox = findOptionCheckbox(wrapper, Categories.SCHOOL);
        schoolCheckbox.element.click();

        wrapper.vm.handleSave();

        expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
          id: 'node1',
          categories: {
            // already daily_life and foundation category selected plus new school category selected
            [Categories.SCHOOL]: true,
            [Categories.DAILY_LIFE]: true,
            [Categories.FOUNDATIONS]: true,
          },
        });
        expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
          id: 'node2',
          categories: {
            // already foundations category selected plus new school category selected
            [Categories.SCHOOL]: true,
            [Categories.FOUNDATIONS]: true,
          },
        });
      });

      test('should not remove common selected options even if they are unchecked', () => {
        nodes['node1'].categories = {
          [Categories.DAILY_LIFE]: true,
          [Categories.FOUNDATIONS]: true,
        };
        nodes['node2'].categories = {
          [Categories.DAILY_LIFE]: true,
        };
        const wrapper = makeWrapper({ nodeIds: ['node1', 'node2'] });

        const dailyLifeCheckbox = findOptionCheckbox(wrapper, Categories.DAILY_LIFE);
        dailyLifeCheckbox.element.click(); // uncheck daily lifye

        const schoolCheckbox = findOptionCheckbox(wrapper, Categories.SCHOOL);
        schoolCheckbox.element.click(); // check school

        wrapper.vm.handleSave();

        expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
          id: 'node1',
          categories: {
            // already daily_life and foundation category selected plus new school category selected
            [Categories.DAILY_LIFE]: true,
            [Categories.FOUNDATIONS]: true,
            [Categories.SCHOOL]: true,
          },
        });
        expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
          id: 'node2',
          categories: {
            // already daily life category selected plus new school category selected
            [Categories.DAILY_LIFE]: true,
            [Categories.SCHOOL]: true,
          },
        });
      });

      test('should not remove common selected options even if they are unchecked and no new options are checked', () => {
        nodes['node1'].categories = {
          [Categories.DAILY_LIFE]: true,
          [Categories.FOUNDATIONS]: true,
          [Categories.SCHOOL]: true,
        };
        nodes['node2'].categories = {
          [Categories.DAILY_LIFE]: true,
          [Categories.FOUNDATIONS]: true,
        };
        const wrapper = makeWrapper({ nodeIds: ['node1', 'node2'] });

        const dailyLifeCheckbox = findOptionCheckbox(wrapper, Categories.DAILY_LIFE);
        dailyLifeCheckbox.element.click(); // uncheck daily lifye

        wrapper.vm.handleSave();

        expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
          id: 'node1',
          categories: {
            // already selected options
            [Categories.DAILY_LIFE]: true,
            [Categories.FOUNDATIONS]: true,
            [Categories.SCHOOL]: true,
          },
        });
        expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
          id: 'node2',
          categories: {
            // already selected options
            [Categories.DAILY_LIFE]: true,
            [Categories.FOUNDATIONS]: true,
          },
        });
      });
    });
    describe('can save method', () => {
      test('should not can save if there are mixed categories and no options selected', () => {
        nodes['node1'].categories = {
          [Categories.DAILY_LIFE]: true,
        };
        nodes['node2'].categories = {
          [Categories.FOUNDATIONS]: true,
        };

        const wrapper = makeWrapper({ nodeIds: ['node1', 'node2'] });

        expect(wrapper.vm.canSave).toBeFalsy();
      });

      test('should can save if there are mixed categories but new options are selected', () => {
        nodes['node1'].categories = {
          [Categories.DAILY_LIFE]: true,
        };
        nodes['node2'].categories = {
          [Categories.FOUNDATIONS]: true,
        };

        const wrapper = makeWrapper({ nodeIds: ['node1', 'node2'] });

        const schoolCheckbox = findOptionCheckbox(wrapper, Categories.SCHOOL);
        schoolCheckbox.element.click();

        expect(wrapper.vm.canSave).toBeTruthy();
      });

      test('should can save if there are mixed categories but at least one common option across all nodes', () => {
        nodes['node1'].categories = {
          [Categories.DAILY_LIFE]: true,
          [Categories.FOUNDATIONS]: true,
        };
        nodes['node2'].categories = {
          [Categories.DAILY_LIFE]: true,
        };

        const wrapper = makeWrapper({ nodeIds: ['node1', 'node2'] });

        expect(wrapper.vm.canSave).toBeTruthy();
      });
    });
  });
});
