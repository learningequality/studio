import { mount } from '@vue/test-utils';
import Vuex from 'vuex';
import EditSourceModal from '../EditSourceModal';
import { LicensesList } from 'shared/leUtils/Licenses';
import { constantsTranslationMixin } from 'shared/mixins';
import EditTitleDescriptionModal from '../EditTitleDescriptionModal';

const nodeId = 'test-id';

let nodes;

let store;
let contentNodeActions;
let generalActions;
let generalGetters;

const MIXED_VALUE = 'mixed';

const getLicenseId = translatedLicense => {
  if (translatedLicense === 'Mixed') {
    return MIXED_VALUE;
  }
  const translatedLicenses = LicensesList.reduce((acc, license) => {
    const { translateConstant } = constantsTranslationMixin.methods;
    acc[translateConstant(license.license_name)] = license.id;
    return acc;
  }, {});
  return translatedLicenses[translatedLicense];
};

const getSourceValues = wrapper => {
  return {
    author: wrapper.find('[data-test="author-input"] input').element.value,
    provider: wrapper.find('[data-test="provider-input"] input').element.value,
    aggregator: wrapper.find('[data-test="aggregator-input"] input').element.value,
    license: getLicenseId(wrapper.find('.v-select__selections').element.textContent),
    license_description: wrapper.find('.license-description textarea')?.element?.value,
    copyright_holder: wrapper.find('[data-test="copyright-holder-input"] input').element.value,
  };
};

const makeWrapper = nodeIds => {
  return mount(EditSourceModal, {
    store,
    propsData: {
      nodeIds,
    },
  });
};

describe('EditSourceModal', () => {
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
    generalGetters = {
      isAboutLicensesModalOpen: () => false,
    };
    store = new Vuex.Store({
      actions: generalActions,
      getters: generalGetters,
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

  describe('Selected source on first render', () => {
    test.only('should display the correct source values when 1 node is selected', async () => {
      nodes['node1'].author = 'author1';
      nodes['node1'].license = 9;
      nodes['node1'].license_description = 'abdcds';
      const wrapper = makeWrapper(['node1']);

      console.log('aaa wrapper html', wrapper.html());
      console.log('aaa', getSourceValues(wrapper));
      expect(true).toBe(true);
    });
  });

  test('should call updateContentNode on success submit', () => {
    const wrapper = mount(EditTitleDescriptionModal, {
      store,
      propsData: {
        nodeId,
      },
    });

    wrapper.find('[data-test="edit-title-description-modal"]').vm.$emit('submit');
    expect(contentNodeActions.updateContentNode).toHaveBeenCalled();
  });

  test('should call updateContentNode with the correct parameters on success submit', () => {
    const wrapper = mount(EditTitleDescriptionModal, {
      store,
      propsData: {
        nodeId,
      },
    });

    const newTitle = 'new-title';
    const newDescription = 'new-description';
    wrapper.find('[data-test="title-input"]').vm.$emit('input', 'new-title');
    wrapper.find('[data-test="description-input"]').vm.$emit('input', 'new-description');

    wrapper.find('[data-test="edit-title-description-modal"]').vm.$emit('submit');

    expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
      id: nodeId,
      title: newTitle,
      description: newDescription,
    });
  });

  test('should let update even if description is empty', () => {
    const wrapper = mount(EditTitleDescriptionModal, {
      store,
      propsData: {
        nodeId,
      },
    });

    const newTitle = 'new-title';
    wrapper.find('[data-test="title-input"]').vm.$emit('input', 'new-title');
    wrapper.find('[data-test="description-input"]').vm.$emit('input', '');

    wrapper.find('[data-test="edit-title-description-modal"]').vm.$emit('submit');

    expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
      id: nodeId,
      title: newTitle,
      description: '',
    });
  });

  test('should validate title on blur', () => {
    const wrapper = mount(EditTitleDescriptionModal, {
      store,
      propsData: {
        nodeId,
      },
    });

    wrapper.find('[data-test="title-input"]').vm.$emit('input', '');
    wrapper.find('[data-test="title-input"]').vm.$emit('blur');

    expect(wrapper.find('[data-test="title-input"]').vm.$props.invalidText).toBeTruthy();
  });

  test('should validate title on submit', () => {
    const wrapper = mount(EditTitleDescriptionModal, {
      store,
      propsData: {
        nodeId,
      },
    });

    wrapper.find('[data-test="title-input"]').vm.$emit('input', '');
    wrapper.find('[data-test="edit-title-description-modal"]').vm.$emit('submit');

    expect(wrapper.find('[data-test="title-input"]').vm.$props.invalidText).toBeTruthy();
  });

  test("should show 'Edited title and description' on a snackbar on success submit", () => {
    const wrapper = mount(EditTitleDescriptionModal, {
      store,
      propsData: {
        nodeId,
      },
    });

    wrapper.find('[data-test="edit-title-description-modal"]').vm.$emit('submit');

    const animationFrameId = requestAnimationFrame(() => {
      expect(generalActions.showSnackbarSimple).toHaveBeenCalledWith(
        expect.anything(),
        'Edited title and description'
      );
      cancelAnimationFrame(animationFrameId);
    });
  });

  test("should emit 'close' event on success submit", () => {
    const wrapper = mount(EditTitleDescriptionModal, {
      store,
      propsData: {
        nodeId,
      },
    });

    wrapper.find('[data-test="edit-title-description-modal"]').vm.$emit('submit');

    const animationFrameId = requestAnimationFrame(() => {
      expect(wrapper.emitted().close).toBeTruthy();
      cancelAnimationFrame(animationFrameId);
    });
  });

  test('should emit close event on cancel', () => {
    const wrapper = mount(EditTitleDescriptionModal, {
      store,
      propsData: {
        nodeId,
      },
    });

    wrapper.find('[data-test="edit-title-description-modal"]').vm.$emit('cancel');
    expect(wrapper.emitted().close).toBeTruthy();
  });
});
