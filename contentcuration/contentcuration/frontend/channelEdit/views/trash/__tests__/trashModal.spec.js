import { render, screen, waitFor, configure, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';

import { factory } from '../../../store';
import { RouteNames } from '../../../constants';
import TrashModal from '../TrashModal';

const TRASH_ID = 'trash-root-id';

const testChildren = [
  { id: 'test1', title: 'Item', kind: 'video', modified: new Date(2020, 1, 20) },
  { id: 'test2', title: 'Item', kind: 'audio', modified: new Date(2020, 2, 1) },
  { id: 'test3', title: 'Topic', kind: 'topic', modified: new Date(2020, 1, 1) },
];

async function makeWrapper(items = testChildren, { isLoading = false, hasMore = false } = {}) {
  const store = factory();

  const loadContentNodesSpy = jest
    .spyOn(TrashModal.methods, 'loadContentNodes')
    .mockResolvedValue({});
  jest.spyOn(TrashModal.methods, 'loadAncestors').mockResolvedValue();
  jest.spyOn(TrashModal.methods, 'removeContentNodes').mockResolvedValue();
  // loadNodes is not mocked intentionally: we let the real implementation run so that
  // the loading state and `more` data are exercised through the mocked loadChildren below.
  const loadNodesSpy = jest.spyOn(TrashModal.methods, 'loadNodes');

  if (isLoading) {
    jest.spyOn(TrashModal.methods, 'loadChildren').mockReturnValue(new Promise(() => {}));
  } else {
    jest.spyOn(TrashModal.methods, 'loadChildren').mockResolvedValue({
      more: hasMore ? { parent: TRASH_ID, page: 2 } : null,
      results: [],
    });
  }

  const router = new VueRouter({
    routes: [
      { name: RouteNames.TRASH, path: '/:nodeId/trash', component: TrashModal },
      {
        name: RouteNames.TREE_VIEW,
        path: '/:nodeId/:detailNodeId?',
        component: { template: '<div>Tree</div>' },
      },
    ],
  });

  router.replace({ name: RouteNames.TRASH, params: { nodeId: 'test' } }).catch(() => {});

  const routerPush = jest.spyOn(router, 'push').mockResolvedValue();

  const utils = render(
    TrashModal,
    {
      store,
      router,
      stubs: {
        ResourceDrawer: true,
        OfflineText: true,
      },
      computed: {
        currentChannel: () => ({ id: 'test-channel-id' }),
        trashId: () => TRASH_ID,
        items: () => items,
        offline: () => false,
        backLink: () => ({ name: RouteNames.TREE_VIEW, params: { nodeId: 'test' } }),
        getSelectedTopicAndResourceCountText: () => ids => `${ids.length} items selected`,
        counts: () => ({ topicCount: 0, resourceCount: 0 }),
      },
    },
    localVue => {
      localVue.use(VueRouter);
    },
  );

  if (!isLoading) {
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });
  }

  const user = userEvent.setup();
  return { ...utils, routerPush, user, loadNodesSpy, loadContentNodesSpy, store };
}

describe('TrashModal', () => {
  beforeAll(() => configure({ testIdAttribute: 'data-test' }));
  afterAll(() => configure({ testIdAttribute: 'data-testid' }));

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('on load', () => {
    it('shows a loading indicator while content is loading', async () => {
      await makeWrapper(testChildren, { isLoading: true });
      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });

    it('shows empty text when trash has no items', async () => {
      await makeWrapper([]);
      expect(screen.getByTestId('empty')).toBeInTheDocument();
    });

    it('shows the item list when trash has items', async () => {
      await makeWrapper();
      expect(screen.getByTestId('list')).toBeInTheDocument();
    });
  });

  describe('on item selection', () => {
    it('checking an item enables the Delete and Restore buttons', async () => {
      const { user } = await makeWrapper();

      expect(screen.getByTestId('delete')).toBeDisabled();
      expect(screen.getByTestId('restore')).toBeDisabled();

      await user.click(within(screen.getAllByTestId('checkbox')[0]).getByRole('checkbox'));

      await waitFor(() => {
        expect(screen.getByTestId('delete')).toBeEnabled();
        expect(screen.getByTestId('restore')).toBeEnabled();
      });
    });

    it('checking the select-all checkbox checks all items', async () => {
      const { user } = await makeWrapper();
      await user.click(screen.getByTestId('selectall'));

      await waitFor(() => {
        screen.getAllByTestId('checkbox').forEach(container => {
          expect(within(container).getByRole('checkbox')).toBeChecked();
        });
      });
    });

    it('clicking an item link sets previewNodeId, opening the ResourceDrawer', async () => {
      const { user } = await makeWrapper();

      const itemLinks = screen.getAllByTestId('item');
      await user.click(itemLinks[0]);

      await waitFor(() => {
        expect(document.querySelector('resourcedrawer-stub')).toHaveAttribute(
          'nodeid',
          testChildren[0].id,
        );
      });
    });
  });

  describe('on close', () => {
    it('clicking the close button navigates back to the tree view', async () => {
      const { routerPush, user } = await makeWrapper();

      const closeButton = await screen.findByTestId('close');
      await user.click(closeButton);

      await waitFor(() => {
        expect(routerPush).toHaveBeenCalledWith(
          expect.objectContaining({ name: RouteNames.TREE_VIEW }),
        );
      });
    });
  });

  describe('on delete', () => {
    it('Delete button is disabled when no items are selected', async () => {
      await makeWrapper();
      expect(screen.getByTestId('delete')).toBeDisabled();
    });

    it('clicking Delete opens a confirmation dialog', async () => {
      const { user } = await makeWrapper();
      await user.click(screen.getByTestId('selectall'));
      await user.click(screen.getByTestId('delete'));

      expect(await screen.findByText(/You cannot undo this action/i)).toBeInTheDocument();
    });

    it('clicking Cancel in the confirmation dialog closes it', async () => {
      const { user } = await makeWrapper();
      await user.click(screen.getByTestId('selectall'));
      await user.click(screen.getByTestId('delete'));
      await screen.findByText(/You cannot undo this action/i);

      await user.click(screen.getByRole('button', { name: /Cancel/i }));

      await waitFor(() => {
        expect(screen.queryByText(/You cannot undo this action/i)).not.toBeInTheDocument();
      });
    });

    it('clicking Delete permanently calls deleteContentNodes with the selected IDs', async () => {
      const deleteContentNodes = jest
        .spyOn(TrashModal.methods, 'deleteContentNodes')
        .mockResolvedValue();

      const { user } = await makeWrapper();

      await user.click(screen.getByTestId('selectall'));
      await user.click(screen.getByTestId('delete'));
      await user.click(await screen.findByRole('button', { name: /Delete permanently/i }));

      await waitFor(() => {
        expect(deleteContentNodes).toHaveBeenCalledWith(testChildren.map(c => c.id));
      });
    });

    it('successful deletion triggers snackbar and reloads nodes', async () => {
      jest.spyOn(TrashModal.methods, 'deleteContentNodes').mockResolvedValue();

      const { user, loadNodesSpy, store } = await makeWrapper();
      const dispatchSpy = jest.spyOn(store, 'dispatch').mockImplementation(() => Promise.resolve());

      await user.click(screen.getByTestId('selectall'));
      await user.click(screen.getByTestId('delete'));
      await user.click(await screen.findByRole('button', { name: /Delete permanently/i }));

      await waitFor(() => {
        expect(dispatchSpy).toHaveBeenCalledWith('showSnackbar', {
          text: 'Permanently deleted',
        });
        expect(loadNodesSpy).toHaveBeenCalled();
      });
    });
  });

  describe('on restore', () => {
    it('Restore button is disabled when no items are selected', async () => {
      await makeWrapper();
      expect(screen.getByTestId('restore')).toBeDisabled();
    });

    it('clicking Restore opens the MoveModal', async () => {
      const { user } = await makeWrapper();
      await user.click(screen.getByTestId('selectall'));
      await user.click(screen.getByTestId('restore'));
      expect(await screen.findByRole('button', { name: /Move here/i })).toBeInTheDocument();
    });

    it('successful restore clears selection and previewNodeId, and reloads nodes', async () => {
      jest.spyOn(TrashModal.methods, 'moveContentNodes').mockResolvedValue();

      const { user, loadNodesSpy } = await makeWrapper();

      await user.click(screen.getByTestId('selectall'));

      const itemLinks = screen.getAllByTestId('item');
      await user.click(itemLinks[0]);

      await user.click(screen.getByTestId('restore'));

      await user.click(await screen.findByRole('button', { name: /Move here/i }));

      await waitFor(() => {
        expect(loadNodesSpy).toHaveBeenCalled();

        screen.getAllByTestId('checkbox').forEach(container => {
          expect(within(container).getByRole('checkbox')).not.toBeChecked();
        });

        const drawer = document.querySelector('resourcedrawer-stub');
        expect(drawer).not.toHaveAttribute('nodeid');
      });
    });
  });

  describe('selection count', () => {
    it('shows selected item count in the bottom bar', async () => {
      const { user } = await makeWrapper();

      expect(screen.queryByText(/items selected/i)).not.toBeInTheDocument();

      await user.click(screen.getByTestId('selectall'));

      expect(await screen.findByText(`${testChildren.length} items selected`)).toBeInTheDocument();
    });
  });

  describe('pagination', () => {
    it('shows a Show more button when there is more paginated content', async () => {
      await makeWrapper([testChildren[0]], { hasMore: true });
      expect(await screen.findByRole('button', { name: /Show more/i })).toBeInTheDocument();
    });

    it('clicking Show more calls loadContentNodes with pagination params', async () => {
      const { user, loadContentNodesSpy } = await makeWrapper([testChildren[0]], { hasMore: true });
      const showMoreBtn = await screen.findByRole('button', { name: /Show more/i });

      await user.click(showMoreBtn);

      await waitFor(() => {
        expect(loadContentNodesSpy).toHaveBeenLastCalledWith({ parent: TRASH_ID, page: 2 });
      });
    });
  });
});
