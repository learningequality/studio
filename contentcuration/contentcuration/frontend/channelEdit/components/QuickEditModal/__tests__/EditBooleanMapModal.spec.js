import Vuex from 'vuex';
import { mount } from '@vue/test-utils';
import EditBooleanMapModal from '../EditBooleanMapModal';
import { Categories } from 'shared/constants';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

let nodes;

let store;
let contentNodeActions;
let generalActions;

const CheckboxValue = {
  UNCHECKED: 'UNCHECKED',
  CHECKED: 'CHECKED',
  INDETERMINATE: 'INDETERMINATE',
};

const categoriesLookup = {};
Object.entries(Categories).forEach(([key, value]) => {
  categoriesLookup[key] = value;
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

const getOptionsChips = wrapper => {
  const chips = wrapper.findAll('[data-test="option-chip"]');
  return chips.wrappers.map(chip => {
    const [{ text } = {}] = chip.vm.$slots.default || [];
    return categoriesLookup[text.trim()] || text.trim();
  });
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
      title: 'Edit Categories',
      field,
      autocompleteLabel: 'Select option',
      confirmationMessage: 'edited',
      ...restOptions,
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

      test('checkbox options should be selected depending on the options set for a single node - learner_needs', () => {
        nodes['node1'].learner_needs = {
          [Categories.DAILY_LIFE]: true,
          [Categories.FOUNDATIONS]: true,
        };

        const wrapper = makeWrapper({ nodeIds: ['node1'], field: 'learner_needs' });

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

      describe('Showing hierarchy', () => {
        test('just root categories should be selected depending on the categories set for a single node', () => {
          nodes['node1'].categories = {
            [Categories.DAILY_LIFE]: true, // root categories
            [Categories.FOUNDATIONS]: true,
          };

          const wrapper = makeWrapper({ nodeIds: ['node1'], showHierarchy: true });

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

        test('parent categories should be selected depending on the categories set for a single node when showing hierarchy', () => {
          nodes['node1'].categories = {
            [Categories.DIVERSITY]: true, // Daily Life -> Diversity
          };

          const wrapper = makeWrapper({ nodeIds: ['node1'], showHierarchy: true });

          const optionsValues = getOptionsValues(wrapper);
          const {
            [Categories.DAILY_LIFE]: dailyLifeValue,
            [Categories.DIVERSITY]: diversityValue,
            ...otheroptionsValues
          } = optionsValues;

          expect(
            Object.values(otheroptionsValues).every(value => value === CheckboxValue.UNCHECKED)
          ).toBeTruthy();
          expect(dailyLifeValue).toBe(CheckboxValue.CHECKED);
          expect(diversityValue).toBe(CheckboxValue.CHECKED);
        });

        test('parent categories should not be selected when not showing hierarchy', () => {
          nodes['node1'].categories = {
            [Categories.DIVERSITY]: true, // Daily Life -> Diversity
          };

          const wrapper = makeWrapper({ nodeIds: ['node1'], showHierarchy: false });

          const optionsValues = getOptionsValues(wrapper);
          const { [Categories.DIVERSITY]: diversityValue, ...otheroptionsValues } = optionsValues;

          expect(
            Object.values(otheroptionsValues).every(value => value === CheckboxValue.UNCHECKED)
          ).toBeTruthy();
          expect(diversityValue).toBe(CheckboxValue.CHECKED);
        });

        test('parent checkbox category should be indeterminate if not all nodes have the same parent categories set', () => {
          nodes['node1'].categories = {
            [Categories.DIVERSITY]: true, // Daily Life -> Diversity
          };

          const wrapper = makeWrapper({ nodeIds: ['node1', 'node2'], showHierarchy: true });

          const optionsValues = getOptionsValues(wrapper);
          const {
            [Categories.DAILY_LIFE]: dailyLifeValue,
            [Categories.DIVERSITY]: diversityValue,
          } = optionsValues;
          expect(dailyLifeValue).toBe(CheckboxValue.INDETERMINATE);
          expect(diversityValue).toBe(CheckboxValue.INDETERMINATE);
        });

        test('multiple parent checkbox categories should be indeterminate if not all nodes have the same parent categories set', () => {
          nodes['node1'].categories = {
            [Categories.DIVERSITY]: true, // Daily Life -> Diversity
          };
          nodes['node2'].categories = {
            [Categories.GUIDES]: true, // For teachers -> Guides
          };

          const wrapper = makeWrapper({ nodeIds: ['node1', 'node2'], showHierarchy: true });

          const optionsValues = getOptionsValues(wrapper);
          const {
            [Categories.DAILY_LIFE]: dailyLifeValue,
            [Categories.FOR_TEACHERS]: forTeachersValue,
          } = optionsValues;
          expect(dailyLifeValue).toBe(CheckboxValue.INDETERMINATE);
          expect(forTeachersValue).toBe(CheckboxValue.INDETERMINATE);
        });

        test('parent checkbox category should be checked if all nodes have the same parent categories set', () => {
          nodes['node1'].categories = {
            [Categories.DIVERSITY]: true, // Daily Life -> Diversity
          };
          nodes['node2'].categories = {
            [Categories.CURRENT_EVENTS]: true, // Daily Life -> Current Events
          };

          const wrapper = makeWrapper({ nodeIds: ['node1', 'node2'], showHierarchy: true });

          const optionsValues = getOptionsValues(wrapper);
          const {
            [Categories.DAILY_LIFE]: dailyLifeValue,
            [Categories.DIVERSITY]: diversityValue,
            [Categories.CURRENT_EVENTS]: currentEventsValue,
          } = optionsValues;
          expect(diversityValue).toBe(CheckboxValue.INDETERMINATE);
          expect(currentEventsValue).toBe(CheckboxValue.INDETERMINATE);
          expect(dailyLifeValue).toBe(CheckboxValue.CHECKED);
        });
      });
    });

    describe('Showing autocomplete', () => {
      test('no chip should be displayed if nodes does not have options set', () => {
        const wrapper = makeWrapper({ nodeIds: ['node1'], showAutocomplete: true });

        const categoriesChips = getOptionsChips(wrapper);
        expect(categoriesChips.length).toBe(0);
      });

      test('should render selected options chips if showing autocomplete - categories', () => {
        nodes['node1'].categories = {
          [Categories.DAILY_LIFE]: true,
          [Categories.FOUNDATIONS]: true,
        };

        const wrapper = makeWrapper({ nodeIds: ['node1'], showAutocomplete: true });

        const categoriesChips = getOptionsChips(wrapper);
        expect(categoriesChips.length).toBe(2);
        expect(categoriesChips).toContain(Categories.DAILY_LIFE);
        expect(categoriesChips).toContain(Categories.FOUNDATIONS);
      });

      test('should render selected options chips  if showing autocomplete - learner_needs', () => {
        nodes['node1'].learner_needs = {
          [Categories.DAILY_LIFE]: true,
          [Categories.FOUNDATIONS]: true,
        };

        const wrapper = makeWrapper({
          nodeIds: ['node1'],
          field: 'learner_needs',
          showAutocomplete: true,
        });

        const categoriesChips = getOptionsChips(wrapper);
        expect(categoriesChips.length).toBe(2);
        expect(categoriesChips).toContain(Categories.DAILY_LIFE);
        expect(categoriesChips).toContain(Categories.FOUNDATIONS);
      });

      test('should not render selected options chips if not showing autocomplete', () => {
        nodes['node1'].categories = {
          [Categories.DAILY_LIFE]: true,
          [Categories.FOUNDATIONS]: true,
        };

        const wrapper = makeWrapper({ nodeIds: ['node1'], showAutocomplete: false });

        const categoriesChips = getOptionsChips(wrapper);
        expect(categoriesChips.length).toBe(0);
      });

      test('should not render parent category chips even though showing hierarchy', () => {
        nodes['node1'].categories = {
          [Categories.DIVERSITY]: true, // Daily Life -> Diversity
        };

        const wrapper = makeWrapper({
          nodeIds: ['node1'],
          showAutocomplete: true,
          showHierarchy: true,
        });

        const categoriesChips = getOptionsChips(wrapper);
        expect(categoriesChips.length).toBe(1);
        expect(categoriesChips).toContain(Categories.DIVERSITY);
      });

      test('should render "Mixed" chip if there are mixed options set', () => {
        nodes['node1'].categories = {
          [Categories.DAILY_LIFE]: true,
          [Categories.FOUNDATIONS]: true,
        };

        const wrapper = makeWrapper({ nodeIds: ['node1', 'node2'], showAutocomplete: true });

        const categoriesChips = getOptionsChips(wrapper);
        expect(categoriesChips.length).toBe(1);
        expect(categoriesChips).toContain('Mixed');
      });

      test('should filter options based on autocomplete search query', () => {
        const searchQuery = 'drama';

        const wrapper = makeWrapper({ nodeIds: ['node1'], showAutocomplete: true });
        const animationFrameId = requestAnimationFrame(() => {
          wrapper.find('[data-test="options-autocomplete"]').setValue(searchQuery);

          const categoriesOptions = wrapper.findAll('[data-test="option-checkbox"]');
          categoriesOptions.wrappers.forEach(checkbox => {
            const { label } = checkbox.vm.$props || {};
            expect(label.toLowerCase()).toContain(searchQuery);
          });
          cancelAnimationFrame(animationFrameId);
        });
      });

      test('should flatten options if autocomplete search query is not empty', () => {
        const wrapper = makeWrapper({ nodeIds: ['node1'], showAutocomplete: true });
        const animationFrameId = requestAnimationFrame(() => {
          wrapper.find('[data-test="options-autocomplete"]').setValue('a');

          const categoriesOptions = wrapper.findAll('[data-test="option-checkbox"]');
          categoriesOptions.wrappers.forEach(checkbox => {
            expect(checkbox.element.style.paddingLeft).toBeFalsy();
          });
          cancelAnimationFrame(animationFrameId);
        });
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
    expect(resourcesCounter.text()).toContain('4');
  });

  test('should display hierarchy of options using more padding on each child level if showing hierarchy', () => {
    const wrapper = makeWrapper({ nodeIds: ['node1'], showHierarchy: true });

    const categoriesOptions = wrapper.findAll('[data-test="option-checkbox"]');
    let schoolPadding;
    let socialSciencesPadding; // school -> social sciences
    let anthropologyPadding; // school -> social sciences -> anthropology
    categoriesOptions.wrappers.forEach(checkbox => {
      const { label } = checkbox.vm.$props || {};
      const padding = checkbox.element.style.paddingLeft;
      const paddingNumber = parseInt(padding.replace('px', ''));
      if (label === 'SCHOOL') {
        schoolPadding = paddingNumber;
      } else if (label === 'SOCIAL_SCIENCES') {
        socialSciencesPadding = paddingNumber;
      } else if (label === 'ANTHROPOLOGY') {
        anthropologyPadding = paddingNumber;
      }
    });

    expect(schoolPadding).toBeLessThan(socialSciencesPadding);
    expect(socialSciencesPadding).toBeLessThan(anthropologyPadding);
  });

  test('should not display hierarchy of options if not showing hierarchy', () => {
    const wrapper = makeWrapper({ nodeIds: ['node1'], showHierarchy: false });

    const categoriesOptions = wrapper.findAll('[data-test="option-checkbox"]');
    let schoolPadding;
    let socialSciencesPadding; // school -> social sciences
    let anthropologyPadding; // school -> social sciences -> anthropology
    categoriesOptions.wrappers.forEach(checkbox => {
      const { label } = checkbox.vm.$props || {};
      const padding = checkbox.element.style.paddingLeft;
      const paddingNumber = parseInt(padding.replace('px', ''));
      if (label === 'school') {
        schoolPadding = paddingNumber;
      } else if (label === 'socialSciences') {
        socialSciencesPadding = paddingNumber;
      } else if (label === 'anthropology') {
        anthropologyPadding = paddingNumber;
      }
    });

    expect(schoolPadding).toBeFalsy();
    expect(socialSciencesPadding).toBeFalsy();
    expect(anthropologyPadding).toBeFalsy();
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

    test('should call updateContentNode with the right options on success submit - learner_needs', () => {
      const wrapper = makeWrapper({ nodeIds: ['node1', 'node2'] });

      const schoolCheckbox = findOptionCheckbox(wrapper, Categories.SCHOOL);
      schoolCheckbox.element.click();
      const sociologyCheckbox = findOptionCheckbox(wrapper, Categories.SOCIOLOGY);
      sociologyCheckbox.element.click();

      const animationFrameId = requestAnimationFrame(() => {
        wrapper.find('[data-test="edit-booleanMap-modal"]').vm.$emit('submit');
        expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
          id: 'node1',
          learner_needs: {
            [Categories.SCHOOL]: true,
            [Categories.SOCIOLOGY]: true,
          },
        });
        expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
          id: 'node2',
          learner_needs: {
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
