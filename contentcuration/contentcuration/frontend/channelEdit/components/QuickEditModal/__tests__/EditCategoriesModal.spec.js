import Vuex from 'vuex';
import { mount } from '@vue/test-utils';
import camelCase from 'lodash/camelCase';
import EditCategoriesModal from '../EditCategoriesModal';
import { Categories } from 'shared/constants';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

let nodes;

let store;
let contentNodeActions;
let generalActions;

const makeWrapper = nodeIds => {
  const wrapper = mount(EditCategoriesModal, {
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
  // replace "translateMetadataString" with (value) => value
  wrapper.vm.translateMetadataString;

  return wrapper;
};

const CheckboxValue = {
  UNCHECKED: 'UNCHECKED',
  CHECKED: 'CHECKED',
  INDETERMINATE: 'INDETERMINATE',
};

const categoriesLookup = {};
Object.entries(Categories).forEach(([key, value]) => {
  categoriesLookup[camelCase(key)] = value;
});

const getCategoriesValues = wrapper => {
  const categories = {};
  const checkboxes = wrapper.findAll('[data-test="category-checkbox"]');
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

const getCategoriesChips = wrapper => {
  const chips = wrapper.findAll('[data-test="category-chip"]');
  return chips.wrappers.map(chip => {
    const [{ text } = {}] = chip.vm.$slots.default || [];
    return categoriesLookup[text.trim()] || text.trim();
  });
};

const findCategoryCheckbox = (wrapper, category) => {
  const checkboxes = wrapper.findAll('[data-test="category-checkbox"]');
  return checkboxes.wrappers.find(checkbox => {
    const { label } = checkbox.vm.$props || {};
    return categoriesLookup[label] === category;
  });
};

describe('EditLanguageModal', () => {
  beforeEach(() => {
    nodes = {
      node1: { id: 'node1' },
      node2: { id: 'node2' },
      node3: { id: 'node3' },
      node4: { id: 'node4' },
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

  describe('Selected categories on first render', () => {
    describe('Category checkboxes', () => {
      test('no category should be selected if a single node does not have categories set', () => {
        const wrapper = makeWrapper(['node1']);

        const categoriesValues = getCategoriesValues(wrapper);
        expect(
          Object.values(categoriesValues).every(value => value === CheckboxValue.UNCHECKED)
        ).toBeTruthy();
      });

      test('no category should be selected if multiple nodes dont have categories set', () => {
        const wrapper = makeWrapper(['node1', 'node2']);

        const categoriesValues = getCategoriesValues(wrapper);
        expect(
          Object.values(categoriesValues).every(value => value === CheckboxValue.UNCHECKED)
        ).toBeTruthy();
      });

      test('just root categories should be selected depending on the categories set for a single node', () => {
        nodes['node1'].categories = {
          [Categories.DAILY_LIFE]: true, // root categories
          [Categories.FOUNDATIONS]: true,
        };

        const wrapper = makeWrapper(['node1']);

        const categoriesValues = getCategoriesValues(wrapper);
        const {
          [Categories.DAILY_LIFE]: dailyLifeValue,
          [Categories.FOUNDATIONS]: foundationsValue,
          ...otherCategoriesValues
        } = categoriesValues;
        expect(
          Object.values(otherCategoriesValues).every(value => value === CheckboxValue.UNCHECKED)
        ).toBeTruthy();
        expect(dailyLifeValue).toBe(CheckboxValue.CHECKED);
        expect(foundationsValue).toBe(CheckboxValue.CHECKED);
      });

      test('parent categories should be selected depending on the categories set for a single node', () => {
        nodes['node1'].categories = {
          [Categories.DIVERSITY]: true, // Daily Life -> Diversity
        };

        const wrapper = makeWrapper(['node1']);

        const categoriesValues = getCategoriesValues(wrapper);
        const {
          [Categories.DAILY_LIFE]: dailyLifeValue,
          [Categories.DIVERSITY]: diversityValue,
          ...otherCategoriesValues
        } = categoriesValues;

        expect(
          Object.values(otherCategoriesValues).every(value => value === CheckboxValue.UNCHECKED)
        ).toBeTruthy();
        expect(dailyLifeValue).toBe(CheckboxValue.CHECKED);
        expect(diversityValue).toBe(CheckboxValue.CHECKED);
      });

      test('checkbox category should be checked if all nodes have the same categories set', () => {
        nodes['node1'].categories = {
          [Categories.DAILY_LIFE]: true,
          [Categories.FOUNDATIONS]: true,
        };
        nodes['node2'].categories = {
          [Categories.DAILY_LIFE]: true,
          [Categories.FOUNDATIONS]: true,
        };

        const wrapper = makeWrapper(['node1', 'node2']);

        const categoriesValues = getCategoriesValues(wrapper);
        const {
          [Categories.DAILY_LIFE]: dailyLifeValue,
          [Categories.FOUNDATIONS]: foundationsValue,
        } = categoriesValues;
        expect(dailyLifeValue).toBe(CheckboxValue.CHECKED);
        expect(foundationsValue).toBe(CheckboxValue.CHECKED);
      });

      test('checkbox category should be indeterminate if not all nodes have the same categories set', () => {
        nodes['node1'].categories = {
          [Categories.DAILY_LIFE]: true,
          [Categories.FOUNDATIONS]: true,
        };
        nodes['node2'].categories = {
          [Categories.DAILY_LIFE]: true,
        };

        const wrapper = makeWrapper(['node1', 'node2']);

        const categoriesValues = getCategoriesValues(wrapper);
        const {
          [Categories.DAILY_LIFE]: dailyLifeValue,
          [Categories.FOUNDATIONS]: foundationsValue,
        } = categoriesValues;
        expect(dailyLifeValue).toBe(CheckboxValue.CHECKED);
        expect(foundationsValue).toBe(CheckboxValue.INDETERMINATE);
      });

      test('parent checkbox category should be indeterminate if not all nodes have the same parent categories set', () => {
        nodes['node1'].categories = {
          [Categories.DIVERSITY]: true, // Daily Life -> Diversity
        };

        const wrapper = makeWrapper(['node1', 'node2']);

        const categoriesValues = getCategoriesValues(wrapper);
        const {
          [Categories.DAILY_LIFE]: dailyLifeValue,
          [Categories.DIVERSITY]: diversityValue,
        } = categoriesValues;
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

        const wrapper = makeWrapper(['node1', 'node2']);

        const categoriesValues = getCategoriesValues(wrapper);
        const {
          [Categories.DAILY_LIFE]: dailyLifeValue,
          [Categories.FOR_TEACHERS]: forTeachersValue,
        } = categoriesValues;
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

        const wrapper = makeWrapper(['node1', 'node2']);

        const categoriesValues = getCategoriesValues(wrapper);
        const {
          [Categories.DAILY_LIFE]: dailyLifeValue,
          [Categories.DIVERSITY]: diversityValue,
          [Categories.CURRENT_EVENTS]: currentEventsValue,
        } = categoriesValues;
        expect(diversityValue).toBe(CheckboxValue.INDETERMINATE);
        expect(currentEventsValue).toBe(CheckboxValue.INDETERMINATE);
        expect(dailyLifeValue).toBe(CheckboxValue.CHECKED);
      });
    });

    describe('Autocomplete category chips', () => {
      test('no chip should be displayed if nodes does not have categories set', () => {
        const wrapper = makeWrapper(['node1']);

        const categoriesChips = getCategoriesChips(wrapper);
        expect(categoriesChips.length).toBe(0);
      });

      test('should render selected category chips', () => {
        nodes['node1'].categories = {
          [Categories.DAILY_LIFE]: true, // root categories
          [Categories.FOUNDATIONS]: true,
        };

        const wrapper = makeWrapper(['node1']);

        const categoriesChips = getCategoriesChips(wrapper);
        expect(categoriesChips.length).toBe(2);
        expect(categoriesChips).toContain(Categories.DAILY_LIFE);
        expect(categoriesChips).toContain(Categories.FOUNDATIONS);
      });

      test('should not render parent category chips', () => {
        nodes['node1'].categories = {
          [Categories.DIVERSITY]: true, // Daily Life -> Diversity
        };

        const wrapper = makeWrapper(['node1']);

        const categoriesChips = getCategoriesChips(wrapper);
        expect(categoriesChips.length).toBe(1);
        expect(categoriesChips).toContain(Categories.DIVERSITY);
      });

      test('should render "Mixed" chip if there are mixed categories set', () => {
        nodes['node1'].categories = {
          [Categories.DAILY_LIFE]: true,
          [Categories.FOUNDATIONS]: true,
        };

        const wrapper = makeWrapper(['node1', 'node2']);

        const categoriesChips = getCategoriesChips(wrapper);
        expect(categoriesChips.length).toBe(1);
        expect(categoriesChips).toContain('Mixed');
      });
    });
  });

  test('should render the message of the number of resources selected', () => {
    const wrapper = makeWrapper(['node1', 'node2']);

    const resourcesCounter = wrapper.find('[data-test="resources-selected-message"]');
    expect(resourcesCounter.exists()).toBeTruthy();
    expect(resourcesCounter.text()).toContain('2');
  });

  test('should render the message of the number of resources selected - 2', () => {
    const wrapper = makeWrapper(['node1', 'node2', 'node3', 'node4']);

    const resourcesCounter = wrapper.find('[data-test="resources-selected-message"]');
    expect(resourcesCounter.exists()).toBeTruthy();
    expect(resourcesCounter.text()).toContain('4');
  });

  test('should display hierarchy of categories using more padding on each child level', () => {
    const wrapper = makeWrapper(['node1']);

    const categoriesOptions = wrapper.findAll('[data-test="category-checkbox"]');
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

    expect(schoolPadding).toBeLessThan(socialSciencesPadding);
    expect(socialSciencesPadding).toBeLessThan(anthropologyPadding);
  });

  test('should filter categories options based on autocomplete search query', () => {
    const searchQuery = 'drama';

    const wrapper = makeWrapper(['node1']);
    const animationFrameId = requestAnimationFrame(() => {
      wrapper.find('[data-test="category-autocomplete"]').setValue(searchQuery);

      const categoriesOptions = wrapper.findAll('[data-test="category-checkbox"]');
      categoriesOptions.wrappers.forEach(checkbox => {
        const { label } = checkbox.vm.$props || {};
        expect(label.toLowerCase()).toContain(searchQuery);
      });
      cancelAnimationFrame(animationFrameId);
    });
  });

  test('should flatten categories options if autocomplete search query is not empty', () => {
    const wrapper = makeWrapper(['node1']);
    const animationFrameId = requestAnimationFrame(() => {
      wrapper.find('[data-test="category-autocomplete"]').setValue('a');

      const categoriesOptions = wrapper.findAll('[data-test="category-checkbox"]');
      categoriesOptions.wrappers.forEach(checkbox => {
        expect(checkbox.element.style.paddingLeft).toBeFalsy();
      });
      cancelAnimationFrame(animationFrameId);
    });
  });

  test('should call updateContentNode with the right categories on success submit', () => {
    const wrapper = makeWrapper(['node1', 'node2']);

    const schoolCheckbox = findCategoryCheckbox(wrapper, Categories.SCHOOL);
    schoolCheckbox.element.click();
    const sociologyCheckbox = findCategoryCheckbox(wrapper, Categories.SOCIOLOGY);
    sociologyCheckbox.element.click();

    const animationFrameId = requestAnimationFrame(() => {
      wrapper.find('[data-test="edit-categories-modal"]').vm.$emit('submit');
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
    const wrapper = makeWrapper(['node1']);

    wrapper.find('[data-test="edit-categories-modal"]').vm.$emit('submit');

    const animationFrameId = requestAnimationFrame(() => {
      expect(wrapper.emitted('close')).toBeTruthy();
      cancelAnimationFrame(animationFrameId);
    });
  });

  test('should emit close event on cancel', () => {
    const wrapper = makeWrapper(['node1']);

    wrapper.find('[data-test="edit-categories-modal"]').vm.$emit('cancel');

    const animationFrameId = requestAnimationFrame(() => {
      expect(wrapper.emitted('close')).toBeTruthy();
      cancelAnimationFrame(animationFrameId);
    });
  });

  test('should show a confirmation snackbar on success submit', () => {
    const wrapper = makeWrapper(['node1']);

    wrapper.find('[data-test="edit-categories-modal"]').vm.$emit('submit');

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

      wrapper.find('[data-test="edit-categories-modal"]').vm.$emit('submit');

      const animationFrameId = requestAnimationFrame(() => {
        expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
          id: 'node1',
          categories: {},
        });
        cancelAnimationFrame(animationFrameId);
      });
    });

    test('should call updateContentNode on success submit if the user checks the checkbox', () => {
      nodes['node1'].kind = ContentKindsNames.TOPIC;

      const wrapper = makeWrapper(['node1']);

      wrapper.find('[data-test="update-descendants-checkbox"] input').setChecked(true);
      wrapper.find('[data-test="edit-categories-modal"]').vm.$emit('submit');

      const animationFrameId = requestAnimationFrame(() => {
        expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
          id: 'node1',
          categories: {},
        });
        cancelAnimationFrame(animationFrameId);
      });
    });
  });
});
