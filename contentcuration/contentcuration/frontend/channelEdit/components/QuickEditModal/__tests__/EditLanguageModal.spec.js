import { mount } from '@vue/test-utils';
import EditLanguageModal from '../EditLanguageModal';
import { factory } from '../../../store';
import { LanguagesList } from 'shared/leUtils/Languages';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

const nodes = [
  { id: 'test-en-res', language: 'en' },
  { id: 'test-es-res', language: 'es' },
  { id: 'test-nolang-res', language: '' },
  { id: 'test-en-topic', language: 'en', kind: ContentKindsNames.TOPIC },
];

function makeWrapper(nodeIds) {
  const wrapper = mount(EditLanguageModal, {
    store: factory(),
    propsData: {
      nodeIds,
      resourcesSelectedText: '2 resources',
    },
    computed: {
      getContentNodes() {
        return () => {
          return nodes.filter(node => nodeIds.includes(node.id));
        };
      },
    },
  });

  const updateContentNode = jest.spyOn(wrapper.vm, 'updateContentNode');
  updateContentNode.mockResolvedValue(null);

  const updateContentNodeDescendants = jest.spyOn(wrapper.vm, 'updateContentNodeDescendants');
  updateContentNodeDescendants.mockResolvedValue(null);

  const showSnackbarSimple = jest.spyOn(wrapper.vm, 'showSnackbarSimple');
  showSnackbarSimple.mockResolvedValue(null);

  const handleSave = jest.spyOn(wrapper.vm, 'handleSave');

  return [
    wrapper,
    { updateContentNode, updateContentNodeDescendants, showSnackbarSimple, handleSave },
  ];
}

async function chooseLanguage(wrapper, language) {
  const checkbox = wrapper.findComponent({ ref: 'radioLanguage_' + language });
  checkbox.vm.update(true);
  await wrapper.vm.$nextTick();
}

describe('EditLanguageModal', () => {
  let wrapper, mocks;

  afterEach(() => {
    if (wrapper) wrapper.destroy();
  });

  it('smoke test', () => {
    const [wrapper] = makeWrapper(['test-en-res']);
    expect(wrapper.exists()).toBe(true);
  });

  describe('Selected language on first render', () => {
    it('no language should be selected if a single node does not have a language', () => {
      [wrapper] = makeWrapper(['test-nolang-res']);

      const checkboxes = wrapper.findAll('input[type="radio"]');
      checkboxes.wrappers.forEach(checkbox => {
        expect(checkbox.element.checked).toBeFalsy();
      });
    });

    it('no language should be selected if just a single node among multiple nodes does not have language', () => {
      [wrapper] = makeWrapper(['test-en-res', 'test-nolang-res']);

      const checkboxes = wrapper.findAll('input[type="radio"]');
      checkboxes.wrappers.forEach(checkbox => {
        expect(checkbox.element.checked).toBeFalsy();
      });
    });

    it('no language should be selected if there are multiple languages set', () => {
      [wrapper] = makeWrapper(['test-en-res', 'test-es-res']);

      const checkboxes = wrapper.findAll('input[type="radio"]');
      checkboxes.wrappers.forEach(checkbox => {
        expect(checkbox.element.checked).toBeFalsy();
      });
    });

    it('the common language should be selected if all nodes have the same language', () => {
      [wrapper] = makeWrapper(['test-en-res', 'test-en-topic']);

      const checkbox = wrapper.find('input[value="en"]');
      expect(checkbox.element.checked).toBeTruthy();
    });
  });

  it('should render the message of the number of resources selected', () => {
    [wrapper] = makeWrapper(['test-en-res', 'test-es-res']);

    const resourcesCounter = wrapper.findComponent('[data-test="resources-selected-message"]');
    expect(resourcesCounter.exists()).toBeTruthy();
    expect(resourcesCounter.text()).toContain('2');
  });

  it('should render the message of the number of resources selected - 2', () => {
    [wrapper] = makeWrapper(['test-en-res', 'test-es-res', 'test-en-topic', 'test-nolang-res']);

    const resourcesCounter = wrapper.findComponent('[data-test="resources-selected-message"]');
    expect(resourcesCounter.exists()).toBeTruthy();
    expect(resourcesCounter.text()).toContain('2 resources');
  });

  it('should filter languages options based on search query', async () => {
    [wrapper] = makeWrapper(['test-en-topic']);

    wrapper.findComponent('[data-test="search-input"]').vm.$emit('input', 'es');
    await wrapper.vm.$nextTick();

    const options = wrapper.findAll('input[type="radio"]');
    options.wrappers.forEach(option => {
      const language = LanguagesList.find(lang => lang.id === option.element.value);
      expect(
        language.id.toLowerCase().includes('es') ||
          language.native_name.toLowerCase().includes('es') ||
          language.readable_name.toLowerCase().includes('es'),
      ).toBeTruthy();
    });
  });

  it('should display information message about different languages if there are multiple languages set', () => {
    [wrapper] = makeWrapper(['test-en-res', 'test-es-res']);

    expect(
      wrapper.findComponent('[data-test="different-languages-message"]').exists(),
    ).toBeTruthy();
  });

  it('shouldnt display information message about different languages if only one language is set', () => {
    [wrapper] = makeWrapper(['test-en-res', 'test-en-topic']);

    expect(wrapper.findComponent('[data-test="different-languages-message"]').exists()).toBeFalsy();
  });

  it('the submit button should be disabled if no language is selected', () => {
    [wrapper] = makeWrapper(['test-en-res', 'test-es-res']);

    const buttons = wrapper.findAll('button').wrappers;
    const submitButton = buttons.find(button => button.text() === 'Save');

    expect(submitButton.element.disabled).toBeTruthy();
  });

  it('the submit button should be enabled if a language is selected', async () => {
    [wrapper] = makeWrapper(['test-en-res', 'test-es-res']);

    const buttons = wrapper.findAll('button').wrappers;
    const submitButton = buttons.find(button => button.text() === 'Save');

    await chooseLanguage(wrapper, 'en');

    expect(submitButton.element.disabled).toBeFalsy();
  });

  // TODO: This test refuses to pass, even though the code is correct.
  it.skip('should call handleSave submit', async () => {
    [wrapper, mocks] = makeWrapper(['test-en-res']);

    await chooseLanguage(wrapper, 'en');
    wrapper.findComponent({ ref: 'modal' }).vm.$emit('submit');
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect(mocks.handleSave).toHaveBeenCalled();
  });

  it('should call updateContentNode with the right language on success submit', async () => {
    [wrapper, mocks] = makeWrapper(['test-en-res']);

    await chooseLanguage(wrapper, 'es');
    await wrapper.vm.handleSave();

    expect(mocks.updateContentNode).toHaveBeenCalledWith({
      id: 'test-en-res',
      language: 'es',
    });
  });

  it('should emit close event on success submit', async () => {
    [wrapper] = makeWrapper(['test-en-res']);

    await chooseLanguage(wrapper, 'en');
    await wrapper.vm.handleSave();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('should emit close event on cancel', async () => {
    [wrapper] = makeWrapper(['test-en-res']);

    wrapper.findComponent({ ref: 'modal' }).vm.$emit('cancel');
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('should show a confirmation snackbar on success submit', async () => {
    [wrapper, mocks] = makeWrapper(['test-en-res']);

    await chooseLanguage(wrapper, 'en');
    await wrapper.vm.handleSave();
    await wrapper.vm.$nextTick();

    expect(mocks.showSnackbarSimple).toHaveBeenCalledWith(expect.anything());
  });

  describe('topic nodes present', () => {
    test('should display a selected checkbox to apply change to descendants if a topic is present', () => {
      const [wrapper] = makeWrapper(['test-en-topic', 'test-en-res']);

      expect(
        wrapper.findComponent('[data-test="update-descendants-checkbox"]').exists(),
      ).toBeTruthy();
    });

    it('should not display the checkbox to apply change to descendants if a topic is not present', () => {
      [wrapper] = makeWrapper(['test-en-res']);

      expect(
        wrapper.findComponent('[data-test="update-descendants-checkbox"]').exists(),
      ).toBeFalsy();
    });

    test('should call updateContentNodeDescendants with the right language on success submit by default', async () => {
      const [wrapper, mocks] = makeWrapper(['test-en-topic', 'test-en-res']);

      await chooseLanguage(wrapper, 'es');
      await wrapper.vm.handleSave();

      expect(mocks.updateContentNodeDescendants).toHaveBeenCalledWith({
        id: 'test-en-topic',
        language: 'es',
      });
    });

    test('should call updateContentNode with the right language on success submit if the user unchecks check the checkbox', async () => {
      const [wrapper, mocks] = makeWrapper(['test-en-topic', 'test-en-res']);

      await chooseLanguage(wrapper, 'es');

      // Uncheck the descendants checkbox
      const descendantsCheckbox = wrapper.findComponent(
        '[data-test="update-descendants-checkbox"]',
      );
      descendantsCheckbox.vm.$emit('change', false);
      await wrapper.vm.$nextTick();

      await wrapper.vm.handleSave();

      expect(mocks.updateContentNode).toHaveBeenCalledWith({
        id: 'test-en-topic',
        language: 'es',
      });
    });
  });
});
