import { render, screen, waitFor, within, configure } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { Store } from 'vuex';
import router from '../../../router';
import { RouteNames } from '../../../constants';
import UserTable from '../UserTable';

jest.mock('shared/client', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));
jest.mock('file-saver', () => ({ saveAs: jest.fn() }));

// Studio's IconButton passes `ariaLabel="text"` as a literal rather than binding it
// (shared/views/IconButton.vue), so icon buttons have no usable accessible name and
// have to be reached by their existing data-test hooks.
configure({ testIdAttribute: 'data-test' });

const USER_IDS = ['user-a', 'user-b', 'user-c'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const mockLoadUsers = jest.fn(() => Promise.resolve({}));
const mockSendEmail = jest.fn(() => Promise.resolve());

function createStore({ users = USER_IDS } = {}) {
  return new Store({
    modules: {
      userAdmin: {
        namespaced: true,
        actions: {
          loadUsers: mockLoadUsers,
          sendEmail: mockSendEmail,
        },
        getters: {
          users: () => users,
          count: () => users.length,
          getUsers: () => ids => ids.map(id => ({ id, email: `${id}@test.com` })),
        },
      },
    },
  });
}

function renderComponent({ users, query = {} } = {}) {
  router.replace({ name: RouteNames.USERS, query }).catch(() => {});
  return render(UserTable, {
    store: createStore({ users }),
    routes: router,
    stubs: { UserItem: true },
  });
}

/**
 * Vuetify's VSelect menu does not open reliably under jsdom, so select-backed
 * filters are reached through the URL the control would produce. A shared or
 * bookmarked filter link is a real entry point, but it is navigation rather than
 * a click — each test relying on it says so.
 */
const renderWithFilters = query => renderComponent({ query });

/** Payload of the most recent user fetch. */
function lastFetchParams() {
  const { calls } = mockLoadUsers.mock;
  return calls[calls.length - 1][1];
}

/**
 * KButton renders `appearance="basic-link"` as an anchor with no href, which has
 * no implicit role, so the clear action is matched by its text.
 */
const clearFiltersLink = () => screen.queryByText('Clear filters');

/** The select-all checkbox lives in the table header, after the filter checkboxes. */
const selectAllCheckbox = () => within(screen.getByRole('table')).getAllByRole('checkbox')[0];

describe('UserTable', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    require('shared/client').default.get.mockResolvedValue({
      data: new Blob(['col1,col2\n1,2'], { type: 'text/csv' }),
    });
  });

  describe('filter controls', () => {
    it('renders every filter control', () => {
      renderComponent();

      expect(screen.getByLabelText('User Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Target location')).toBeInTheDocument();
      expect(screen.getByLabelText('Search for a user...')).toBeInTheDocument();
      expect(screen.getByLabelText('Joined within')).toBeInTheDocument();
      expect(screen.getByLabelText('Active within')).toBeInTheDocument();
      expect(screen.getByLabelText('Has published a channel')).toBeInTheDocument();
      expect(screen.getByLabelText('Has Studio activity')).toBeInTheDocument();
    });

    it('typing a search term fetches users filtered by keyword', async () => {
      renderComponent();

      await user.type(screen.getByLabelText('Search for a user...'), 'keyword test');

      await waitFor(() => {
        expect(lastFetchParams()).toMatchObject({ keywords: 'keyword test' });
      });
    });

    it('ticking "has published a channel" fetches users filtered by published_channel', async () => {
      renderComponent();

      await user.click(screen.getByLabelText('Has published a channel'));

      await waitFor(() => {
        expect(lastFetchParams()).toMatchObject({ published_channel: true });
      });
    });

    it('ticking "has Studio activity" fetches users filtered by has_edits', async () => {
      renderComponent();

      await user.click(screen.getByLabelText('Has Studio activity'));

      await waitFor(() => {
        expect(lastFetchParams()).toMatchObject({ has_edits: true });
      });
    });

    // Reached by URL rather than by opening the select — see renderWithFilters.
    it('a user type selection fetches users filtered by that type', async () => {
      renderWithFilters({ userType: 'administrator' });

      await waitFor(() => {
        expect(lastFetchParams()).toMatchObject({ is_admin: true });
      });
    });

    // Reached by URL rather than by opening the select — see renderWithFilters.
    it('a joined-within selection fetches users filtered by an ISO joined_since date', async () => {
      renderWithFilters({ joinedWithin: '3mo' });

      await waitFor(() => {
        expect(lastFetchParams().joined_since).toMatch(ISO_DATE);
      });
    });

    // Reached by URL rather than by opening the select — see renderWithFilters.
    it('an active-within selection fetches users filtered by an ISO active_since date', async () => {
      renderWithFilters({ activeWithin: '1mo' });

      await waitFor(() => {
        expect(lastFetchParams().active_since).toMatch(ISO_DATE);
      });
    });

    // Reached by URL rather than by opening the select — see renderWithFilters.
    it('a target location selection fetches users filtered by that location', async () => {
      renderWithFilters({ location: 'Afghanistan' });

      await waitFor(() => {
        expect(lastFetchParams()).toMatchObject({ location: 'Afghanistan' });
      });
    });
  });

  describe('clearing filters', () => {
    it('is not offered on a page with no filters applied', () => {
      renderComponent();

      expect(clearFiltersLink()).not.toBeInTheDocument();
    });

    it('is offered once a filter is applied', async () => {
      renderComponent();

      await user.click(screen.getByLabelText('Has published a channel'));

      await waitFor(() => {
        expect(clearFiltersLink()).toBeInTheDocument();
      });
    });

    // Reached by URL rather than by opening the select — see renderWithFilters.
    it('is offered for a user type of "All", which narrows nothing but is still a selection', async () => {
      renderWithFilters({ userType: 'all' });

      await waitFor(() => {
        expect(clearFiltersLink()).toBeInTheDocument();
      });
      await waitFor(() => {
        expect(mockLoadUsers).toHaveBeenCalled();
      });
      expect(lastFetchParams()).not.toHaveProperty('is_admin');
    });

    // Reached by URL rather than by opening the select — see renderWithFilters.
    it('stays unoffered for date windows left at their default', () => {
      renderWithFilters({ joinedWithin: 'any', activeWithin: 'any' });

      expect(clearFiltersLink()).not.toBeInTheDocument();
    });

    it('is withdrawn again after a checkbox is ticked and unticked', async () => {
      renderComponent();
      const checkbox = screen.getByLabelText('Has published a channel');

      await user.click(checkbox);
      await waitFor(() => {
        expect(clearFiltersLink()).toBeInTheDocument();
      });

      await user.click(checkbox);

      await waitFor(() => {
        expect(clearFiltersLink()).not.toBeInTheDocument();
      });
    });

    it('clears the checkboxes and the keyword search', async () => {
      renderComponent();

      await user.type(screen.getByLabelText('Search for a user...'), 'keyword test');
      // The search is debounced; let it reach the URL before clearing, otherwise a
      // pending write lands after the clear and restores the term.
      await waitFor(() => {
        expect(router.currentRoute.query.keywords).toBe('keyword test');
      });
      await user.click(screen.getByLabelText('Has published a channel'));
      await user.click(screen.getByLabelText('Has Studio activity'));
      await waitFor(() => {
        expect(clearFiltersLink()).toBeInTheDocument();
      });

      await user.click(clearFiltersLink());

      await waitFor(() => {
        expect(screen.getByLabelText('Search for a user...')).toHaveValue('');
      });
      expect(screen.getByLabelText('Has published a channel')).not.toBeChecked();
      expect(screen.getByLabelText('Has Studio activity')).not.toBeChecked();
      expect(clearFiltersLink()).not.toBeInTheDocument();
    });

    it('removes every filter query param while preserving pagination and sorting', async () => {
      renderWithFilters({
        userType: 'administrator',
        location: 'Afghanistan',
        joinedWithin: '3mo',
        activeWithin: '1mo',
        hasPublished: 'yes',
        hasEdits: 'yes',
        keywords: 'keyword test',
        page: '3',
        page_size: '25',
        sortBy: 'email',
        descending: 'false',
      });

      await user.click(clearFiltersLink());

      await waitFor(() => {
        expect(Object.keys(router.currentRoute.query).sort()).toEqual([
          'descending',
          'page',
          'page_size',
          'sortBy',
        ]);
      });
      expect(router.currentRoute.query.sortBy).toBe('email');
    });
  });

  describe('selection and bulk actions', () => {
    it('offers no bulk email action until users are selected', () => {
      renderComponent();

      expect(screen.queryByTestId('email')).not.toBeInTheDocument();
    });

    it('selecting all users offers a bulk email action for them', async () => {
      renderComponent();

      await user.click(selectAllCheckbox());

      expect(await screen.findByTestId('email')).toBeInTheDocument();
      expect(screen.getByText(`(${USER_IDS.length})`)).toBeInTheDocument();
    });

    it('discards the selection when the filters change', async () => {
      renderComponent();

      await user.click(selectAllCheckbox());
      expect(await screen.findByTestId('email')).toBeInTheDocument();

      await user.click(screen.getByLabelText('Has published a channel'));

      await waitFor(() => {
        expect(screen.queryByTestId('email')).not.toBeInTheDocument();
      });
    });

    it('the bulk email action opens the send email dialog', async () => {
      renderComponent();

      await user.click(selectAllCheckbox());
      await user.click(await screen.findByTestId('email'));

      expect(await screen.findByRole('heading', { name: 'Send email' })).toBeInTheDocument();
    });
  });

  describe('CSV download', () => {
    it('offers the download when there are users to export', () => {
      renderComponent();

      expect(screen.getByTestId('csv')).toBeEnabled();
    });

    it('is unavailable when there are no users to export', () => {
      renderComponent({ users: [] });

      expect(screen.getByTestId('csv')).toBeDisabled();
    });

    it('downloads a dated CSV built from the current filters', async () => {
      const client = require('shared/client').default;
      const { saveAs } = require('file-saver');
      renderComponent();

      await user.click(screen.getByTestId('csv'));

      await waitFor(() => {
        expect(saveAs).toHaveBeenCalled();
      });
      expect(client.get.mock.calls[0][1].responseType).toBe('blob');
      const [savedBlob, savedName] = saveAs.mock.calls[0];
      expect(savedBlob).toBeInstanceOf(Blob);
      expect(savedName).toMatch(/^studio_users_\d{4}-\d{2}-\d{2}\.csv$/);
    });
  });
});
