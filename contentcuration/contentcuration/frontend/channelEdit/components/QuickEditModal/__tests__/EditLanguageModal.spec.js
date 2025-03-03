import { mount } from '@vue/test-utils';
import { Store } from 'vuex';
import EditLanguageModal from '../EditLanguageModal';
import { LanguagesList } from 'shared/leUtils/Languages';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

const nodes = [
  { id: 'test-en-res', language: 'en' },
  { id: 'test-es-res', language: 'es' },
  { id: 'test-nolang-res', language: '' },
  { id: 'test-en-topic', language: 'en', kind: ContentKindsNames.TOPIC },
];

let store;
let contentNodeActions;
let generalActions;

const makeWrapper = nodeIds => {
  return mount(EditLanguageModal, {
    store,
    propsData: {
      nodeIds,
      resourcesSelectedText: '2 resources',
    },
  });
};

describe('EditLanguageModal', () => {
  beforeEach(() => {
    contentNodeActions = {
      updateContentNode: jest.fn(),
      updateContentNodeDescendants: jest.fn(),
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
            getContentNodes: () => ids => nodes.filter(node => ids.includes(node.id)),
          },
        },
      },
    });
  });

  test('smoke test', () => {
    const wrapper = makeWrapper(['test-en-res']);
    expect(wrapper.isVueInstance()).toBe(true);
  });

  describe('Selected language on first render', () => {
    test('no language should be selected if a single node does not have a language', () => {
      const wrapper = makeWrapper(['test-nolang-res']);

      const checkboxes = wrapper.findAll('input[type="radio"]');
      checkboxes.wrappers.forEach(checkbox => {
        expect(checkbox.element.checked).toBeFalsy();
      });
    });

    test('no language should be selected if just a single node among multiple nodes does not have language', () => {
      const wrapper = makeWrapper(['test-en-res', 'test-nolang-res']);

      const checkboxes = wrapper.findAll('input[type="radio"]');
      checkboxes.wrappers.forEach(checkbox => {
        expect(checkbox.element.checked).toBeFalsy();
      });
    });

    test('no language should be selected if there are multiple languages set', () => {
      const wrapper = makeWrapper(['test-en-res', 'test-es-res']);

      const checkboxes = wrapper.findAll('input[type="radio"]');
      checkboxes.wrappers.forEach(checkbox => {
        expect(checkbox.element.checked).toBeFalsy();
      });
    });

    test('the common language should be selected if all nodes have the same language', () => {
      const wrapper = makeWrapper(['test-en-res', 'test-en-topic']);

      const checkbox = wrapper.find('input[value="en"]');
      expect(checkbox.element.checked).toBeTruthy();
    });
  });

  test('should render the message of the number of resources selected', () => {
    const wrapper = makeWrapper(['test-en-res', 'test-es-res']);

    const resourcesCounter = wrapper.find('[data-test="resources-selected-message"]');
    expect(resourcesCounter.exists()).toBeTruthy();
    expect(resourcesCounter.text()).toContain('2');
  });

  test('should render the message of the number of resources selected - 2', () => {
    const wrapper = makeWrapper(['test-en-res', 'test-es-res', 'test-en-topic', 'test-nolang-res']);

    const resourcesCounter = wrapper.find('[data-test="resources-selected-message"]');
    expect(resourcesCounter.exists()).toBeTruthy();
    expect(resourcesCounter.text()).toContain('2 resources');
  });

  test('should filter languages options based on search query', () => {
    const wrapper = makeWrapper(['test-en-topic']);

    wrapper.find('[data-test="search-input"]').vm.$emit('input', 'es');

    const optionsList = wrapper.find('[data-test="language-options-list"]');
    const options = optionsList.findAll('input[type="radio"]');
    options.wrappers.forEach(option => {
      const language = LanguagesList.find(lang => lang.id === option.element.value);
      expect(
        language.id.toLowerCase().includes('es') ||
          language.native_name.toLowerCase().includes('es') ||
          language.readable_name.toLowerCase().includes('es'),
      ).toBeTruthy();
    });
  });

  test('should display information message about different languages if there are multiple languages set', () => {
    const wrapper = makeWrapper(['test-en-res', 'test-es-res']);

    expect(wrapper.find('[data-test="different-languages-message"]').exists()).toBeTruthy();
  });

  test('shouldnt display information message about different languages if only one language is set', () => {
    const wrapper = makeWrapper(['test-en-res', 'test-en-topic']);

    expect(wrapper.find('[data-test="different-languages-message"]').exists()).toBeFalsy();
  });

  test('the submit button should be disabled if no language is selected', () => {
    const wrapper = makeWrapper(['test-en-res', 'test-es-res']);

    const buttons = wrapper.findAll('button').wrappers;
    const submitButton = buttons.find(button => button.text() === 'Save');

    expect(submitButton.element.disabled).toBeTruthy();
  });

  test('the submit button should be enabled if a language is selected', () => {
    const wrapper = makeWrapper(['test-en-res', 'test-es-res']);

    const buttons = wrapper.findAll('button').wrappers;
    const submitButton = buttons.find(button => button.text() === 'Save');

    wrapper.find('input[value="en"]').setChecked(true);

    expect(submitButton.element.disabled).toBeFalsy();
  });

  test('should call updateContentNode with the right language on success submit', () => {
    const wrapper = makeWrapper(['test-en-res']);

    wrapper.find('input[value="en"]').setChecked(true);
    wrapper.find('[data-test="edit-language-modal"]').vm.$emit('submit');

    const animationFrameId = requestAnimationFrame(() => {
      expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
        id: 'test-es-res',
        language: 'en',
      });
      expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
        id: 'test-en-res',
        language: 'en',
      });
      cancelAnimationFrame(animationFrameId);
    });
  });

  test('should emit close event on success submit', () => {
    const wrapper = makeWrapper(['test-en-res']);

    wrapper.find('input[value="en"]').setChecked(true);
    wrapper.find('[data-test="edit-language-modal"]').vm.$emit('submit');

    const animationFrameId = requestAnimationFrame(() => {
      expect(wrapper.emitted('close')).toBeTruthy();
      cancelAnimationFrame(animationFrameId);
    });
  });

  test('should emit close event on cancel', () => {
    const wrapper = makeWrapper(['test-en-res']);

    wrapper.find('[data-test="edit-language-modal"]').vm.$emit('cancel');

    const animationFrameId = requestAnimationFrame(() => {
      expect(wrapper.emitted('close')).toBeTruthy();
      cancelAnimationFrame(animationFrameId);
    });
  });

  test('should show a confirmation snackbar on success submit', () => {
    const wrapper = makeWrapper(['test-en-res']);

    wrapper.find('input[value="en"]').setChecked(true);
    wrapper.find('[data-test="edit-language-modal"]').vm.$emit('submit');

    const animationFrameId = requestAnimationFrame(() => {
      expect(generalActions.showSnackbarSimple).toHaveBeenCalled();
      cancelAnimationFrame(animationFrameId);
    });
  });

  describe('topic nodes present', () => {
    test('should display the checkbox to apply change to descendants if a topic is present', () => {
      const wrapper = makeWrapper(['test-en-topic', 'test-en-res']);

      expect(wrapper.find('[data-test="update-descendants-checkbox"]').exists()).toBeTruthy();
    });

    test('should not display the checkbox to apply change to descendants if a topic is not present', () => {
      const wrapper = makeWrapper(['test-en-res']);

      expect(wrapper.find('[data-test="update-descendants-checkbox"]').exists()).toBeFalsy();
    });

    test('should call updateContentNode with the right language on success submit if the user does not check the checkbox', () => {
      const wrapper = makeWrapper(['test-en-topic', 'test-en-res']);

      wrapper.find('input[value="es"]').setChecked(true);
      wrapper.find('[data-test="edit-language-modal"]').vm.$emit('submit');

      const animationFrameId = requestAnimationFrame(() => {
        expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
          id: 'test-en-topic',
          language: 'es',
        });
        cancelAnimationFrame(animationFrameId);
      });
    });

    test('should call updateContentNodeDescendants with the right language on success submit if the user checks the checkbox', () => {
      const wrapper = makeWrapper(['test-en-topic', 'test-en-res']);

      wrapper.find('input[value="es"]').setChecked(true);
      wrapper.find('[data-test="update-descendants-checkbox"] input').setChecked(true);
      wrapper.find('[data-test="edit-language-modal"]').vm.$emit('submit');

      const animationFrameId = requestAnimationFrame(() => {
        expect(contentNodeActions.updateContentNodeDescendants).toHaveBeenCalledWith(
          expect.anything(),
          {
            id: 'test-en-topic',
            language: 'es',
          },
        );
        cancelAnimationFrame(animationFrameId);
      });
    });
  });
});
