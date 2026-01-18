import { render, screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import StudioNavigation from '../StudioNavigation';

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);

global.window.Urls = {
  channels: jest.fn(() => '/channels'),
  administration: jest.fn(() => '/administration'),
  settings: jest.fn(() => '/settings'),
};

const mockActions = {
  logout: jest.fn(() => Promise.resolve()),
  trackClick: jest.fn(),
};

const renderComponent = (props = {}, user = null) => {
  const store = new Vuex.Store({
    modules: {
      session: {
        state: { currentUser: user },
        getters: { loggedIn: () => !!user },
        actions: { logout: mockActions.logout },
      },
    },
  });

  const router = new VueRouter({
    routes: [
      { path: '/', name: 'home' },
      { path: '/channels', name: 'channels' },
      { path: '/settings', name: 'settings' },
      { path: '/administration', name: 'administration' },
      { path: '/library', name: 'library' },
    ],
  });

  return render(StudioNavigation, {
    localVue,
    store,
    router,
    props: {
      title: 'Kolibri Studio',
      ...props,
    },

    mocks: {
      $formatNumber: n => n,
      $tr: key => {
        const map = {
          title: 'Kolibri Studio',
          openMenu: 'Open navigation menu',
          userMenuLabel: 'User menu',
          guestMenuLabel: 'Guest menu',
          navigationMenu: 'Navigation menu',
          signIn: 'Sign in',
          signOut: 'Sign out',
          channels: 'Channels',
          settings: 'Settings',
          help: 'Help and support',
          changeLanguage: 'Change language',
          administration: 'Administration',
          copyright: '© 2026 Learning Equality',
          giveFeedback: 'Give feedback',
          confirmAction: 'Confirm',
          cancelAction: 'Cancel',
          changeLanguageModalHeader: 'Change language',
          skipToMainContentAction: 'Skip to main content',
        };
        return map[key] || key;
      },
    },
  });
};

describe('StudioNavigation', () => {
  const originalLocation = window.location;
  beforeAll(() => {
    delete window.location;
    window.location = { href: '', assign: jest.fn() };
    window.open = jest.fn();
  });

  afterAll(() => {
    window.location = originalLocation;
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('guest view', () => {
    it('should display the logo link and guest menu', () => {
      renderComponent({}, null);

      const logoLink = screen.getByRole('link', { name: /Kolibri Logo/i });
      expect(logoLink).toBeInTheDocument();
      expect(logoLink).toHaveAttribute('href', expect.stringContaining('/'));

      expect(screen.getByRole('button', { name: /Guest menu/i })).toBeVisible();
      expect(
        screen.queryByRole('button', { name: /Open navigation menu/i }),
      ).not.toBeInTheDocument();
    });

    it('opens guest menu and shows options', async () => {
      const user = userEvent.setup();
      renderComponent({}, null);

      const guestMenuTrigger = screen.getByRole('button', { name: /Guest menu/i });
      expect(guestMenuTrigger).toBeVisible();
      await user.click(guestMenuTrigger);
      expect(screen.getByText('Sign in')).toBeVisible();
      expect(screen.getByText('Change language')).toBeVisible();
    });
  });

  describe('logged in view', () => {
    const defaultUser = {
      first_name: 'TestUser',
      is_admin: false,
    };

    it('should display hamburger menu and user name', () => {
      renderComponent({}, defaultUser);

      expect(screen.getByRole('button', { name: /Open navigation menu/i })).toBeVisible();
      expect(screen.getByRole('button', { name: /User menu/i })).toBeVisible();
      expect(screen.getByText('TestUser')).toBeVisible();
    });

    it('renders user menu options when clicked', async () => {
      const user = userEvent.setup();
      renderComponent({}, defaultUser);

      const userMenuTrigger = screen.getByRole('button', { name: /User menu/i });
      expect(userMenuTrigger).toBeVisible();
      await user.click(userMenuTrigger);

      expect(screen.getByText('Settings')).toBeVisible();
      expect(screen.getByText('Sign out')).toBeVisible();
      expect(screen.getByText('Help and support')).toBeVisible();
      expect(screen.getByText('Change language')).toBeVisible();
      expect(screen.queryByText('Administration')).not.toBeInTheDocument();
    });

    it('renders admin options for admin users', async () => {
      const user = userEvent.setup();
      renderComponent({}, { ...defaultUser, is_admin: true });

      const userMenuTrigger = screen.getByRole('button', { name: /User menu/i });
      expect(userMenuTrigger).toBeVisible();
      await user.click(userMenuTrigger);

      expect(screen.getByText('Administration')).toBeVisible();
    });

    it('triggers logout action', async () => {
      const user = userEvent.setup();
      renderComponent({}, defaultUser);

      await user.click(screen.getByRole('button', { name: /User menu/i }));
      await user.click(screen.getByText('Sign out'));

      expect(mockActions.logout).toHaveBeenCalled();
    });
  });

  describe('side panel navigation', () => {
    const defaultUser = { first_name: 'TestUser' };

    it('should open side panel when hamburger menu is clicked', async () => {
      const user = userEvent.setup();
      renderComponent({}, defaultUser);

      expect(screen.queryByRole('dialog', { name: /Navigation menu/i })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /Open navigation menu/i }));

      const sidePanel = screen.getByRole('region', { name: 'Navigation menu' });
      expect(sidePanel).toBeVisible();
      const panelScope = within(sidePanel);
      expect(panelScope.getByText(/Kolibri Studio/)).toBeVisible();
    });
    it('should display correct navigation links in side panel', async () => {
      const user = userEvent.setup();
      renderComponent({}, defaultUser);

      await user.click(screen.getByRole('button', { name: /Open navigation menu/i }));

      const sidePanel = screen.getByRole('region', { name: 'Navigation menu' });

      const panelScope = within(sidePanel);

      expect(panelScope.getByText('Channels')).toBeVisible();
      expect(panelScope.getByText('Settings')).toBeVisible();
      expect(panelScope.getByText('Help and support')).toBeVisible();
      expect(panelScope.getByText('Sign out')).toBeVisible();
    });

    it('opens language modal from side panel', async () => {
      const user = userEvent.setup();
      renderComponent({}, defaultUser);

      await user.click(screen.getByRole('button', { name: /Open navigation menu/i }));
      const sidePanel = screen.getByRole('region', { name: 'Navigation menu' });
      await user.click(within(sidePanel).getByText('Change language'));
      expect(await screen.findByRole('dialog', { name: 'Change language' })).toBeVisible();
      expect(screen.getByLabelText('English')).toBeVisible();
    });
  });

  describe('Tab Navigation', () => {
    const tabs = [
      { id: '1', label: 'My Channels', to: { name: 'channels' }, badgeValue: 0 },
      { id: '2', label: 'Content Library', to: { name: 'library' }, badgeValue: 5 },
    ];

    it('renders tabs correctly', () => {
      renderComponent({ tabs }, { first_name: 'User' });

      expect(screen.getByText('My Channels')).toBeVisible();
      expect(screen.getByText('Content Library')).toBeVisible();
      expect(screen.getByText('5')).toBeVisible();
    });
  });
});
