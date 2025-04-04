import { mount } from '@vue/test-utils';
import { Store } from 'vuex';
import EditSourceModal from '../EditSourceModal';
import { LicensesList } from 'shared/leUtils/Licenses';
import { constantsTranslationMixin } from 'shared/mixins';

let nodes;

let store;
let contentNodeActions;
let generalActions;

const MIXED_VALUE = 'Mixed';

const getLicenseId = translatedLicense => {
  if (translatedLicense === MIXED_VALUE) {
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
      resourcesSelectedText: '2 resources',
    },
  });
};

describe('EditSourceModal', () => {
  beforeEach(() => {
    nodes = {
      node1: {
        id: 'node1',
        copyright_holder: 'Test',
      },
      node2: {
        id: 'node2',
        copyright_holder: 'Test',
      },
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
    expect(wrapper.exists()).toBe(true);
  });

  describe('Selected source on first render', () => {
    test('should display the correct source values when one node is selected', () => {
      const testValues = {
        author: 'Test author',
        provider: 'Test provider',
        aggregator: 'Test aggregator',
        license: 9,
        license_description: 'Test license description',
        copyright_holder: 'Test copyright',
      };
      Object.assign(nodes.node1, testValues);
      const wrapper = makeWrapper(['node1']);

      expect(getSourceValues(wrapper)).toEqual(expect.anything(), testValues);
    });

    test('should display the common source values when multiple nodes are selected', () => {
      const testValues = {
        author: 'Test author',
        provider: 'Test provider',
      };
      Object.assign(nodes.node1, testValues);
      Object.assign(nodes.node2, testValues);

      const wrapper = makeWrapper(['node1', 'node2']);

      expect(getSourceValues(wrapper)).toEqual(expect.anything(), testValues);
    });

    test('should display the mixed value when the selected nodes have different values', () => {
      nodes['node1'].author = 'Test author';
      nodes['node2'].author = 'Test author 2';

      const wrapper = makeWrapper(['node1', 'node2']);

      const sourceValues = getSourceValues(wrapper);
      expect(sourceValues.author).toEqual(MIXED_VALUE);
    });

    test('should disable inputs when all nodes are imported', () => {
      nodes['node1'].original_source_node_id = 'original_node1';
      nodes['node2'].original_source_node_id = 'original_node2';

      const wrapper = makeWrapper(['node1', 'node2']);

      expect(wrapper.find('[data-test="author-input"] input').element.disabled).toBe(true);
      expect(wrapper.find('[data-test="provider-input"] input').element.disabled).toBe(true);
      expect(wrapper.find('[data-test="aggregator-input"] input').element.disabled).toBe(true);
      expect(wrapper.find('[data-test="copyright-holder-input"] input').element.disabled).toBe(
        true,
      );
    });

    test('should show message that source cannot be edited when all nodes are imported', () => {
      nodes['node1'].original_source_node_id = 'original_node1';
      nodes['node2'].original_source_node_id = 'original_node2';

      const wrapper = makeWrapper(['node1', 'node2']);

      expect(wrapper.find('.help').text()).toContain(EditSourceModal.$trs.cannotEditPublic);
    });

    test('should disable inputs when node has freeze_authoring_data set to true', () => {
      nodes['node1'].freeze_authoring_data = true;

      const wrapper = makeWrapper(['node1']);

      expect(wrapper.find('[data-test="author-input"] input').element.disabled).toBe(true);
      expect(wrapper.find('[data-test="provider-input"] input').element.disabled).toBe(true);
      expect(wrapper.find('[data-test="aggregator-input"] input').element.disabled).toBe(true);
      expect(wrapper.find('[data-test="copyright-holder-input"] input').element.disabled).toBe(
        true,
      );
    });

    test('should show message that source cannot be edited when node has freeze_authoring_data set to true', () => {
      nodes['node1'].freeze_authoring_data = true;

      const wrapper = makeWrapper(['node1']);

      expect(wrapper.find('.help').text()).toContain(EditSourceModal.$trs.cannotEditPublic);
    });

    test('should not disable inputs when not all nodes are imported', () => {
      nodes['node1'].original_source_node_id = 'original_node1';

      const wrapper = makeWrapper(['node1', 'node2']);

      expect(wrapper.find('[data-test="author-input"] input').element.disabled).toBe(false);
      expect(wrapper.find('[data-test="provider-input"] input').element.disabled).toBe(false);
      expect(wrapper.find('[data-test="aggregator-input"] input').element.disabled).toBe(false);
      expect(wrapper.find('[data-test="copyright-holder-input"] input').element.disabled).toBe(
        false,
      );
    });

    test('should show a message that edits will be reflected only for local resources if just some nodes are imported, but not all', () => {
      nodes['node1'].original_source_node_id = 'original_node1';

      const wrapper = makeWrapper(['node1', 'node2']);

      expect(wrapper.find('.help').text()).toContain(
        'Edits will be reflected only for local resources',
      );
    });
  });

  describe('On submit', () => {
    test('should not call updateContentNode on submit if copyright holder is missing', () => {
      nodes['node1'].copyright_holder = '';
      const wrapper = makeWrapper(['node1']);
      wrapper.find('[data-test="edit-source-modal"]').vm.$emit('submit');

      expect(contentNodeActions.updateContentNode).not.toHaveBeenCalled();
    });

    test('should call updateContentNode on success submit for all editable nodes', () => {
      const wrapper = makeWrapper(['node1', 'node2']);
      wrapper.find('[data-test="edit-source-modal"]').vm.$emit('submit');

      expect(contentNodeActions.updateContentNode).toHaveBeenCalled();
    });

    test('should call updateContentNode with the correct parameters on success submit for all editable nodes', () => {
      nodes['node1'].author = 'Test author';
      const newAuthor = 'new-author';

      const wrapper = makeWrapper(['node1', 'node2']);
      wrapper.find('[data-test="author-input"]').vm.$emit('input', newAuthor);
      wrapper.find('[data-test="edit-source-modal"]').vm.$emit('submit');

      expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id: 'node1',
          author: newAuthor,
        }),
      );
    });

    test('should call updateContentNode on submit just for the editable nodes', () => {
      nodes['node1'].original_source_node_id = 'original_node1';
      const wrapper = makeWrapper(['node1', 'node2']);
      wrapper.find('[data-test="edit-source-modal"]').vm.$emit('submit');

      expect(contentNodeActions.updateContentNode).toHaveBeenCalledTimes(1);
      expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id: 'node2',
        }),
      );
      expect(contentNodeActions.updateContentNode).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id: 'node1',
        }),
      );
    });

    test('should not call updateContentNode on submit if all nodes are imported', () => {
      nodes['node1'].original_source_node_id = 'original_node1';
      nodes['node2'].original_source_node_id = 'original_node2';
      const wrapper = makeWrapper(['node1', 'node2']);
      wrapper.find('[data-test="edit-source-modal"]').vm.$emit('submit');

      expect(contentNodeActions.updateContentNode).not.toHaveBeenCalled();
    });

    test('should show a snackbar with the correct number of edited nodes on success submit', () => {
      const wrapper = makeWrapper(['node1', 'node2']);
      wrapper.find('[data-test="edit-source-modal"]').vm.$emit('submit');

      const animationFrameId = requestAnimationFrame(() => {
        expect(generalActions.showSnackbarSimple).toHaveBeenCalledWith(
          expect.anything(),
          'Edited attribution for 2 resources',
        );
        cancelAnimationFrame(animationFrameId);
      });
    });

    test('should show a snack bar with the correct number of edited nodes on success submit if some nodes are imported', () => {
      nodes['node1'].original_source_node_id = 'original_node1';
      const wrapper = makeWrapper(['node1', 'node2']);
      wrapper.find('[data-test="edit-source-modal"]').vm.$emit('submit');

      const animationFrameId = requestAnimationFrame(() => {
        expect(generalActions.showSnackbarSimple).toHaveBeenCalledWith(
          expect.anything(),
          'Edited attribution for 1 resource',
        );
        cancelAnimationFrame(animationFrameId);
      });
    });

    test('should emit close event on success submit', () => {
      const wrapper = makeWrapper(['node1', 'node2']);
      wrapper.find('[data-test="edit-source-modal"]').vm.$emit('submit');

      const animationFrameId = requestAnimationFrame(() => {
        expect(wrapper.emitted('close')).toBeTruthy();
        cancelAnimationFrame(animationFrameId);
      });
    });
  });

  test('should render the message of the number of resources selected', () => {
    const wrapper = makeWrapper(['node1', 'node2']);

    const resourcesCounter = wrapper.find('[data-test="resources-selected-message"]');
    expect(resourcesCounter.exists()).toBeTruthy();
    expect(resourcesCounter.text()).toContain('2');
  });

  test('should emit close event on cancel', () => {
    const wrapper = makeWrapper(['node1', 'node2']);

    wrapper.find('[data-test="edit-source-modal"]').vm.$emit('cancel');
    expect(wrapper.emitted('close')).toBeTruthy();
  });
});
