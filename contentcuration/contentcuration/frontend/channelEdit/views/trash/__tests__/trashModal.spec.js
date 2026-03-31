import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import TrashModal from '../TrashModal';
import { factory } from '../../../store';
import router from '../../../router';
import { RouteNames } from '../../../constants';

const testChildren = [
  {
    id: 'test1',
    title: 'Item1',
    kind: 'video',
    modified: new Date(2020, 1, 20),
  },
  {
    id: 'test2',
    title: 'Item2',
    kind: 'audio',
    modified: new Date(2020, 2, 1),
  },
  {
    id: 'test3',
    title: 'Topic1',
    kind: 'topic',
    modified: new Date(2020, 1, 1),
  },
];

const makeWrapper = (items = testChildren, dataOverride = {}) => {
  const store = factory();
  
  // Create spies for methods before rendering
  const loadContentNodes = jest.spyOn(TrashModal.methods, 'loadContentNodes');
  loadContentNodes.mockImplementation(() => Promise.resolve());
  const loadAncestors = jest.spyOn(TrashModal.methods, 'loadAncestors');
  loadAncestors.mockImplementation(() => Promise.resolve());
  const loadChildren = jest.spyOn(TrashModal.methods, 'loadChildren');
  loadChildren.mockImplementation(() => Promise.resolve({ more: null, results: [] }));
  const removeContentNodes = jest.spyOn(TrashModal.methods, 'removeContentNodes');
  removeContentNodes.mockImplementation(() => Promise.resolve());

  const loadNodes = jest.spyOn(TrashModal.methods, 'loadNodes');
  // If we want loading: true, we can set dataOverride.
  loadNodes.mockImplementation(function() {
    this.loading = dataOverride.loading !== undefined ? dataOverride.loading : false;
    this.more = null;
    this.moreLoading = false;
  });

  const utils = render(TrashModal, {
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
        return items;
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
      MoveModal: {
        template: '<movemodal-stub></movemodal-stub>',
        methods: { moveComplete: jest.fn() }
      },
    },
    propsData: {
      nodeId: 'test',
    },
  });

  return { ...utils, store, loadContentNodes, loadAncestors, loadChildren, loadNodes, removeContentNodes };
};

describe('trashModal', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    router.replace({ name: RouteNames.TRASH, params: { nodeId: 'test' } }).catch(() => {});
  });

  describe('on load', () => {
    it('should show loading indicator if content is loading', async () => {
      makeWrapper(testChildren, { loading: true });
      expect(document.querySelector('[data-test="loading"]')).toBeInTheDocument();
    });

    it('should show empty text if there are no items', async () => {
      makeWrapper([]);
      expect(screen.getByText('Trash is empty')).toBeInTheDocument();
    });

    it('should show items in list', async () => {
      makeWrapper();
      expect(screen.getByText('Item1')).toBeInTheDocument();
      expect(screen.getByText('Item2')).toBeInTheDocument();
      expect(screen.getByText('Topic1')).toBeInTheDocument();
    });
  });

  describe('on topic tree selection', () => {
    it('clicking item should set previewNodeId', async () => {
      makeWrapper();
      expect(screen.getByText('Item1')).toBeInTheDocument();

      const item1 = screen.getByText('Item1');
      await user.click(item1);

      await waitFor(() => {
        const drawer = document.querySelector('resourcedrawer-stub');
        expect(drawer).toHaveAttribute('nodeid', 'test1');
      });
    });

    it('checking item in list should add the item ID to the selected array', async () => {
      makeWrapper();
      expect(screen.getByText('Item1')).toBeInTheDocument();

      const checkboxes = screen.getAllByRole('checkbox');
      const firstItemCheckbox = checkboxes[1];
      
      expect(screen.getByRole('button', { name: /Delete/i })).toBeDisabled();
      
      await user.click(firstItemCheckbox);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Delete/i })).toBeEnabled();
      });
    });

    it('checking select all checkbox should check all items', async () => {
      makeWrapper();
      expect(screen.getByText('Item1')).toBeInTheDocument();

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(selectAllCheckbox);

      await waitFor(() => {
        const itemCheckboxes = screen.getAllByRole('checkbox').slice(1);
        itemCheckboxes.forEach(checkbox => {
          expect(checkbox).toBeChecked();
        });
      });
    });
  });

  describe('on close', () => {
    it('clicking close button should go back to parent route', async () => {
      makeWrapper();
      expect(screen.getByText('Item1')).toBeInTheDocument();

      const closeButton = document.querySelector('[data-test="close"]');
      await user.click(closeButton);

      await waitFor(() => {
        expect(router.currentRoute.name).toBe('TEST_PARENT');
      });
    });
  });

  describe('on delete', () => {
    it('DELETE button should be disabled if no items are selected', async () => {
      makeWrapper();
      expect(screen.getByText('Item1')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Delete/i })).toBeDisabled();
    });

    it('clicking DELETE button should open delete confirmation dialog', async () => {
      makeWrapper();
      expect(screen.getByText('Item1')).toBeInTheDocument();

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(selectAllCheckbox);

      const deleteButton = screen.getByRole('button', { name: /Delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/You cannot undo this action/i)).toBeInTheDocument();
      });
    });

    it('clicking CLOSE on delete confirmation dialog should close the dialog', async () => {
      makeWrapper();
      expect(screen.getByText('Item1')).toBeInTheDocument();

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(selectAllCheckbox);

      const deleteButton = screen.getByRole('button', { name: /Delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText(/You cannot undo this action/i)).not.toBeInTheDocument();
      });
    });

    it('clicking DELETE PERMANENTLY on delete confirmation dialog should trigger deletion', async () => {
      const deleteContentNodesSpy = jest.spyOn(TrashModal.methods, 'deleteContentNodes');
      deleteContentNodesSpy.mockImplementation(() => Promise.resolve());

      makeWrapper();
      expect(screen.getByText('Item1')).toBeInTheDocument();

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(selectAllCheckbox);

      const deleteButton = screen.getByRole('button', { name: /Delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Delete permanently/i })).toBeInTheDocument();
      });

      const confirmDeleteButton = screen.getByRole('button', { name: /Delete permanently/i });
      await user.click(confirmDeleteButton);

      await waitFor(() => {
        expect(deleteContentNodesSpy).toHaveBeenCalledWith(['test1', 'test2', 'test3']);
      });
      deleteContentNodesSpy.mockRestore();
    });
  });

  describe('on restore', () => {
    it('RESTORE button should be disabled if no items are selected', async () => {
      makeWrapper();
      expect(screen.getByText('Item1')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Restore/i })).toBeDisabled();
    });

    it('RESTORE should set moveModalOpen to true', async () => {
      makeWrapper();
      expect(screen.getByText('Item1')).toBeInTheDocument();

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(selectAllCheckbox);

      const restoreButton = screen.getByRole('button', { name: /Restore/i });
      await user.click(restoreButton);

      await waitFor(() => {
        expect(document.querySelector('.fullscreen-modal-window')).toBeFalsy();
      });
    });

    it('moveNodes should clear selected and previewNodeId', async () => {
      const moveContentNodesSpy = jest.spyOn(TrashModal.methods, 'moveContentNodes');
      moveContentNodesSpy.mockImplementation(() => Promise.resolve());

      makeWrapper();
      expect(screen.getByText('Item1')).toBeInTheDocument();

      const itemCheckbox = screen.getAllByRole('checkbox')[1];
      await user.click(itemCheckbox);
      
      const itemText = screen.getByText('Item2');
      await user.click(itemText);

      await waitFor(() => {
        expect(document.querySelector('resourcedrawer-stub')).toHaveAttribute('nodeid', 'test2');
      });

      // Restore action to open MoveModal
      const restoreButton = screen.getByRole('button', { name: /Restore/i });
      await user.click(restoreButton);

      await waitFor(() => {
        expect(document.querySelector('movemodal-stub')).toBeInTheDocument();
      });

      const moveModalStub = document.querySelector('movemodal-stub');
      moveModalStub.__vue__.$emit('target', 'new-parent-id');

      await waitFor(() => {
        expect(moveContentNodesSpy).toHaveBeenCalledWith(expect.objectContaining({
          id__in: expect.any(Array),
          parent: 'new-parent-id'
        }));
      });
      moveContentNodesSpy.mockRestore();
    });
  });
});
