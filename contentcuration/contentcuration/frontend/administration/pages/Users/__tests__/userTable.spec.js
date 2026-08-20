import { render, screen, waitFor, within, configure } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { Store } from 'vuex';
import router from '../../../router';
import { RouteNames } from '../../../constants';
import UserTable from '../UserTable';
import { usersStrings } from '../usersStrings';
import { commonStrings } from 'shared/strings/commonStrings';

const {
  userCount$,
  clearFiltersAction$,
  userTypeLabel$,
  targetLocationLabel$,
  searchLabel$,
  joinedWithinLabel$,
  activeWithinLabel$,
  hasPublishedLabel$,
  hasStudioActivityLabel$,
  userTypeAdministrators$,
  userTypeAll$,
} = usersStrings;

const { clearAction$ } = commonStrings;

jest.mock('shared/client', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));
jest.mock('file-saver', () => ({ saveAs: jest.fn() }));

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
 * KSelect mounts every dropdown into one shared Popper overlay, so the two date
 * windows offering identical labels cannot be told apart by a click.
 */
const renderWithFilters = query => renderComponent({ query });

function lastFetchParams() {
  const { calls } = mockLoadUsers.mock;
  return calls[calls.length - 1][1];
}

/**
 * KButton renders `appearance="basic-link"` as an anchor with no href, which has
 * no implicit role, so the clear action is matched by its text.
 */
const clearFiltersLink = () => screen.queryByText(clearFiltersAction$());

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

  describe('heading', () => {
    it('pluralises the match count', () => {
      renderComponent();

      expect(screen.getByText(userCount$({ count: USER_IDS.length }))).toBeInTheDocument();
    });

    it('uses the singular form for one match', () => {
      renderComponent({ users: [USER_IDS[0]] });

      expect(screen.getByText(userCount$({ count: 1 }))).toBeInTheDocument();
    });
  });

  describe('filter controls', () => {
    it('renders every filter control', () => {
      renderComponent();

      // KSelect renders its label as plain text in a div, with no <label> element
      // and no aria-label, so its controls cannot be found by accessible name.
      expect(screen.getByText(userTypeLabel$())).toBeInTheDocument();
      expect(screen.getByText(joinedWithinLabel$())).toBeInTheDocument();
      expect(screen.getByText(activeWithinLabel$())).toBeInTheDocument();

      expect(screen.getByLabelText(targetLocationLabel$())).toBeInTheDocument();
      expect(screen.getByLabelText(searchLabel$())).toBeInTheDocument();
      expect(screen.getByLabelText(hasPublishedLabel$())).toBeInTheDocument();
      expect(screen.getByLabelText(hasStudioActivityLabel$())).toBeInTheDocument();
    });

    it('typing a search term fetches users filtered by keyword', async () => {
      renderComponent();

      await user.type(screen.getByLabelText(searchLabel$()), 'keyword test');

      await waitFor(() => {
        expect(lastFetchParams()).toMatchObject({ keywords: 'keyword test' });
      });
    });

    it("the search field's clear button drops the keyword filter", async () => {
      renderComponent();

      await user.type(screen.getByLabelText(searchLabel$()), 'keyword test');
      await waitFor(() => {
        expect(router.currentRoute.query.keywords).toBe('keyword test');
      });

      await user.click(screen.getByRole('button', { name: clearAction$() }));

      await waitFor(() => {
        expect(router.currentRoute.query.keywords).toBeUndefined();
      });
      expect(screen.getByLabelText(searchLabel$())).toHaveValue('');
    });

    it('ticking "has published a channel" fetches users filtered by published_channel', async () => {
      renderComponent();

      await user.click(screen.getByLabelText(hasPublishedLabel$()));

      await waitFor(() => {
        expect(lastFetchParams()).toMatchObject({ published_channel: true });
      });
    });

    it('ticking "has Studio activity" fetches users filtered by has_edits', async () => {
      renderComponent();

      await user.click(screen.getByLabelText(hasStudioActivityLabel$()));

      await waitFor(() => {
        expect(lastFetchParams()).toMatchObject({ has_edits: true });
      });
    });

    it('a user type selection fetches users filtered by that type', async () => {
      renderComponent();

      await user.click(screen.getByText(userTypeLabel$()));
      await user.click(await screen.findByText(userTypeAdministrators$()));

      await waitFor(() => {
        expect(lastFetchParams()).toMatchObject({ is_admin: true });
      });
    });

    it('a joined-within selection fetches users filtered by an ISO joined_since date', async () => {
      renderWithFilters({ joinedWithin: '3mo' });

      await waitFor(() => {
        expect(lastFetchParams().joined_since).toMatch(ISO_DATE);
      });
    });

    it('an active-within selection fetches users filtered by an ISO active_since date', async () => {
      renderWithFilters({ activeWithin: '1mo' });

      await waitFor(() => {
        expect(lastFetchParams().active_since).toMatch(ISO_DATE);
      });
    });

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

      await user.click(screen.getByLabelText(hasPublishedLabel$()));

      await waitFor(() => {
        expect(clearFiltersLink()).toBeInTheDocument();
      });
    });

    it('is offered for a user type of "All", which narrows nothing but is still a selection', async () => {
      renderComponent();

      await user.click(screen.getByText(userTypeLabel$()));
      await user.click(await screen.findByText(userTypeAll$()));

      await waitFor(() => {
        expect(clearFiltersLink()).toBeInTheDocument();
      });
      expect(lastFetchParams()).not.toHaveProperty('is_admin');
    });

    it('stays unoffered for date windows left at their default', () => {
      renderWithFilters({ joinedWithin: 'any', activeWithin: 'any' });

      expect(clearFiltersLink()).not.toBeInTheDocument();
    });

    it('is withdrawn again after a checkbox is ticked and unticked', async () => {
      renderComponent();
      const checkbox = screen.getByLabelText(hasPublishedLabel$());

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

      await user.type(screen.getByLabelText(searchLabel$()), 'keyword test');
      // useKeywordSearch debounces, so a pending write would land after the clear.
      await waitFor(() => {
        expect(router.currentRoute.query.keywords).toBe('keyword test');
      });
      await user.click(screen.getByLabelText(hasPublishedLabel$()));
      await user.click(screen.getByLabelText(hasStudioActivityLabel$()));
      await waitFor(() => {
        expect(clearFiltersLink()).toBeInTheDocument();
      });

      await user.click(clearFiltersLink());

      await waitFor(() => {
        expect(screen.getByLabelText(searchLabel$())).toHaveValue('');
      });
      expect(screen.getByLabelText(hasPublishedLabel$())).not.toBeChecked();
      expect(screen.getByLabelText(hasStudioActivityLabel$())).not.toBeChecked();
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

      await user.click(screen.getByLabelText(hasPublishedLabel$()));

      await waitFor(() => {
        expect(screen.queryByTestId('email')).not.toBeInTheDocument();
      });
    });

    it('the bulk email action opens the send email dialog', async () => {
      renderComponent();

      await user.click(selectAllCheckbox());
      await user.click(await screen.findByTestId('email'));

      // EmailUsersDialog has no $trs, so there is no key to reference for its title.
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
