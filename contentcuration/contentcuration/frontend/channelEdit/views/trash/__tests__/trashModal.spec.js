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
  return mount(TrashModal, {
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
    methods: {
      loadContentNodes: jest.fn(),
      loadAncestors: jest.fn(),
      loadChildren: jest.fn(() => Promise.resolve({ more: null, results: [] })),
    },
    stubs: {
      ResourceDrawer: true,
      OfflineText: true,
    },
  });
}

describe('trashModal', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
    router.replace({ name: RouteNames.TRASH, params: { nodeId: 'test' } }).catch(() => {});
    wrapper.setData({ loading: false });
  });
  describe('on load', () => {
    it('should show loading indicator if content is loading', () => {
      wrapper.setData({ loading: true });
      expect(wrapper.find('[data-test="loading"]').exists()).toBe(true);
    });
    it('should show empty text if there are no items', () => {
      const emptyWrapper = makeWrapper([]);
      emptyWrapper.setData({ loading: false });
      expect(emptyWrapper.find('[data-test="empty"]').exists()).toBe(true);
    });
    it('should show items in list', () => {
      expect(wrapper.find('[data-test="list"]').exists()).toBe(true);
    });
  });
  describe('on topic tree selection', () => {
    it('clicking item should set previewNodeId', () => {
      wrapper.find('[data-test="item"]').trigger('click');
      expect(wrapper.vm.previewNodeId).toBe(testChildren[0].id);
    });
    it('checking item in list should add the item ID to the selected array', () => {
      wrapper
        .find('[data-test="checkbox"]')
        .find('input[type="checkbox"]')
        .element.click();
      expect(wrapper.vm.selected).toEqual(['test1']);
    });
    it('checking select all checkbox should check all items', () => {
      wrapper.find('[data-test="selectall"]').vm.$emit('input', true);
      expect(wrapper.vm.selected).toEqual(testChildren.map(c => c.id));
    });
  });
  describe('on close', () => {
    it('clicking close button should go back to parent route', () => {
      wrapper.find('[data-test="close"]').trigger('click');
      expect(wrapper.vm.$route.name).toBe('TEST_PARENT');
    });
  });
  describe('on delete', () => {
    it('DELETE button should be disabled if no items are selected', () => {
      expect(wrapper.find('[data-test="delete"]').vm.disabled).toBe(true);
    });
    it('clicking DELETE button should open delete confirmation dialog', () => {
      wrapper.setData({ selected: testChildren.map(c => c.id) });
      wrapper.find('[data-test="delete"]').trigger('click');
      expect(wrapper.vm.showConfirmationDialog).toBe(true);
    });
    it('clicking CLOSE on delete confirmation dialog should close the dialog', () => {
      wrapper.setData({ showConfirmationDialog: true });
      wrapper.find('[data-test="closeconfirm"]').trigger('click');
      expect(wrapper.vm.showConfirmationDialog).toBe(false);
    });
    it('clicking DELETE PERMANENTLY on delete confirmation dialog should trigger deletion', () => {
      const selected = testChildren.map(c => c.id);
      const deleteContentNodes = jest.fn().mockReturnValue(Promise.resolve());
      wrapper.setMethods({ deleteContentNodes });
      wrapper.setData({ selected });
      wrapper.setData({ showConfirmationDialog: true });
      wrapper.find('[data-test="deleteconfirm"]').trigger('click');
      expect(deleteContentNodes).toHaveBeenCalledWith(selected);
    });
  });
  describe('on restore', () => {
    it('RESTORE button should be disabled if no items are selected', () => {
      expect(wrapper.find('[data-test="restore"]').vm.disabled).toBe(true);
    });
    it('RESTORE should set moveModalOpen to true', () => {
      const selected = testChildren.map(c => c.id);
      wrapper.setData({ selected });
      wrapper.find('[data-test="restore"]').trigger('click');
      expect(wrapper.vm.moveModalOpen).toBe(true);
    });
    it('moveNoves should clear selected and previewNodeId', () => {
      const moveContentNodes = jest.fn(() => Promise.resolve());
      wrapper.setMethods({ moveContentNodes });
      wrapper.vm.moveNodes();
      expect(wrapper.vm.selected).toEqual([]);
      expect(wrapper.vm.previewNodeId).toBe(null);
    });
  });
});
