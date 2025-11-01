import { mount } from '@vue/test-utils';
import TrashModal from '../TrashModal';
import { factory } from '../../../store';
import router from '../../../router';
import { RouteNames } from '../../../constants';

const store = factory();

const testChildren = [
  {
    id: 'test1',
    title: 'Item',
    kind: 'video',
    modified: new Date(2020, 1, 20),
  },
  {
    id: 'test2',
    title: 'Item',
    kind: 'audio',
    modified: new Date(2020, 2, 1),
  },
  {
    id: 'test3',
    title: 'Topic',
    kind: 'topic',
    modified: new Date(2020, 1, 1),
  },
];

function makeWrapper(items) {
  const loadContentNodes = jest.spyOn(TrashModal.methods, 'loadContentNodes');
  loadContentNodes.mockImplementation(() => Promise.resolve());
  const loadAncestors = jest.spyOn(TrashModal.methods, 'loadAncestors');
  loadAncestors.mockImplementation(() => Promise.resolve());
  const loadChildren = jest.spyOn(TrashModal.methods, 'loadChildren');
  loadChildren.mockImplementation(() => Promise.resolve({ more: null, results: [] }));

  const wrapper = mount(TrashModal, {
    store,
    router,
    computed: {
      currentChannel() {
        return {
          id: 'current channel',
        };
      },
      trashId() {
        return 'trash';
      },
      items() {
        return items || testChildren;
      },
      offline() {
        return false;
      },
      backLink() {
        return {
          name: 'TEST_PARENT',
        };
      },
    },
    stubs: {
      ResourceDrawer: true,
      OfflineText: true,
    },
  });

  return [wrapper, { loadContentNodes, loadAncestors, loadChildren }];
}

describe('trashModal', () => {
  let wrapper;

  beforeEach(async () => {
    [wrapper] = makeWrapper();
    router.replace({ name: RouteNames.TRASH, params: { nodeId: 'test' } }).catch(() => {});
    await wrapper.setData({ loading: false });
  });

  describe('on load', () => {
    it('should show loading indicator if content is loading', async () => {
      await wrapper.setData({ loading: true });
      expect(wrapper.findComponent('[data-test="loading"]').exists()).toBe(true);
    });

    it('should show empty text if there are no items', async () => {
      const [emptyWrapper] = makeWrapper([]);
      await emptyWrapper.setData({ loading: false });
      expect(emptyWrapper.findComponent('[data-test="empty"]').exists()).toBe(true);
    });

    it('should show items in list', () => {
      expect(wrapper.findComponent('[data-test="list"]').exists()).toBe(true);
    });
  });

  describe('on topic tree selection', () => {
    it('clicking item should set previewNodeId', async () => {
      await wrapper.findComponent('[data-test="item"]').trigger('click');
      expect(wrapper.vm.previewNodeId).toBe(testChildren[0].id);
    });

    it('checking item in list should add the item ID to the selected array', () => {
      wrapper
        .findComponent('[data-test="checkbox"]')
        .find('input[type="checkbox"]')
        .element.click();
      expect(wrapper.vm.selected).toEqual(['test1']);
    });

    it('checking select all checkbox should check all items', () => {
      wrapper.findComponent('[data-test="selectall"]').vm.$emit('input', true);
      expect(wrapper.vm.selected).toEqual(testChildren.map(c => c.id));
    });
  });

  describe('on close', () => {
    it('clicking close button should go back to parent route', async () => {
      await wrapper.findComponent('[data-test="close"]').trigger('click');
      expect(wrapper.vm.$route.name).toBe('TEST_PARENT');
    });
  });

  describe('on delete', () => {
    it('DELETE button should be disabled if no items are selected', () => {
      expect(wrapper.findComponent('[data-test="delete"]').vm.disabled).toBe(true);
    });

    it('clicking DELETE button should open delete confirmation dialog', async () => {
      await wrapper.setData({ selected: testChildren.map(c => c.id) });
      await wrapper.findComponent('[data-test="delete"]').trigger('click');
      expect(wrapper.vm.showConfirmationDialog).toBe(true);
    });

    it('clicking CLOSE on delete confirmation dialog should close the dialog', async () => {
      await wrapper.setData({ showConfirmationDialog: true });
      const modal = wrapper.find('[data-test="delete-confirmation-dialog"]');
      await modal.vm.$emit('cancel');
      expect(wrapper.vm.showConfirmationDialog).toBe(false);
    });

    it('clicking DELETE PERMANENTLY on delete confirmation dialog should trigger deletion', async () => {
      const selected = testChildren.map(c => c.id);
      const deleteContentNodes = jest.spyOn(wrapper.vm, 'deleteContentNodes');
      deleteContentNodes.mockImplementation(() => Promise.resolve());
      await wrapper.setData({ selected, showConfirmationDialog: true });
      const modal = wrapper.find('[data-test="delete-confirmation-dialog"]');
      await modal.vm.$emit('submit');
      expect(deleteContentNodes).toHaveBeenCalledWith(selected);
    });
  });

  describe('on restore', () => {
    it('RESTORE button should be disabled if no items are selected', () => {
      expect(wrapper.findComponent('[data-test="restore"]').vm.disabled).toBe(true);
    });

    it('RESTORE should set moveModalOpen to true', async () => {
      const selected = testChildren.map(c => c.id);
      await wrapper.setData({ selected });
      await wrapper.findComponent('[data-test="restore"]').trigger('click');
      expect(wrapper.vm.moveModalOpen).toBe(true);
    });

    it('moveNoves should clear selected and previewNodeId', async () => {
      const moveContentNodes = jest.spyOn(wrapper.vm, 'moveContentNodes');
      moveContentNodes.mockImplementation(() => Promise.resolve());
      wrapper.vm.moveNodes();
      expect(wrapper.vm.selected).toEqual([]);
      expect(wrapper.vm.previewNodeId).toBe(null);
    });
  });
});
