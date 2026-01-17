import { render, screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import StudioNavigation from '../StudioNavigation';

const localVue = createLocalVue();
localVue.use(Vuex);

global.window.Urls = {
  channels: jest.fn(() => '/channels'),
  administration: jest.fn(() => '/administration'),
  settings: jest.fn(() => '/settings'),
};

const mockActions = {
  logout: jest.fn(() => Promise.resolve()),
  trackClick: jest.fn(),
};

const createMockStore = (currentUser = null) => {
  return new Vuex.Store({
    modules: {
      session: {
        state: {
          currentUser: currentUser,
        },
        getters: {
          loggedIn: () => !!currentUser,
        },
        actions: {
          logout: mockActions.logout,
        },
      },
    },
  });
};

const createMockRouter = () => {
  return new VueRouter({
    routes: [
      { path: '/', name: 'home' },
      { path: '/channels', name: 'channels' },
      { path: '/settings', name: 'settings' },
      { path: '/administration', name: 'administration' },
      { path: '/library', name: 'library' },
    ],
  });
};

const stubs = {
  KToolbar: { template: '<div><slot name="icon"></slot><slot name="brand"></slot><slot name="actions"></slot></div>' },
  KIconButton: { 
    props: ['icon', 'ariaLabel'], 
    template: '<button :aria-label="ariaLabel || icon" v-on="$listeners"><slot></slot></button>' 
  },
  KExternalLink: { 
    props: ['href', 'text'], 
    template: '<a :href="href">{{ text }}<slot></slot></a>' 
  },
  KLogo: { template: '<img alt="Kolibri Logo" />' },
  KDropdownMenu: {
    props: ['options'],
    template: `
      <div data-testid="dropdown-menu">
        <button v-for="opt in options" :key="opt.value" @click="$emit('select', opt)">
          {{ opt.label }}
        </button>
      </div>
    `
  },
  StudioNavigationTab: { 
    props: ['to'],
    template: '<router-link :to="to"><slot></slot></router-link>' 
  },
  SidePanelModal: { 
    template: `
      <div role="dialog" aria-label="Navigation menu">
        <button aria-label="Close" @click="$emit('closePanel')">Close</button>
        <slot name="header"></slot>
        <slot></slot>
      </div>
    ` 
  },
  StudioNavigationOption: { 
    props: ['label', 'link'], 
    template: '<a :href="link" @click="$emit(\'select\') || $emit(\'click\')">{{ label }}</a>' 
  },
  SkipNavigationLink: { template: '<a>Skip</a>' },
  LanguageSwitcherModal: { template: '<div role="dialog">Language Modal</div>' },
};

const renderComponent = (props = {}, user = null) => {
  const store = createMockStore(user);
  const router = createMockRouter();

  return render(StudioNavigation, {
    localVue,
    store,
    routes: router,
    props: {
      title: 'Kolibri Studio',
      ...props,
    },
    stubs,
    mocks: {
      $tr: (key) => {
        const strings = {
          title: 'Kolibri Studio',
          openMenu: 'Open navigation menu',
          navigationMenu: 'Navigation menu',
          userMenuLabel: 'User menu',
          guestMenuLabel: 'Guest menu',
          signIn: 'Sign in',
          signOut: 'Sign out',
          administration: 'Administration',
          settings: 'Settings',
          help: 'Help and support',
          changeLanguage: 'Change language',
          channels: 'Channels',
          copyright: '© 2026 Learning Equality',
          giveFeedback: 'Give feedback',
        };
        return strings[key] || key;
      },
    },
  });
};

describe('StudioNavigation', () => {
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
      expect(screen.queryByRole('button', { name: /Open navigation menu/i })).not.toBeInTheDocument();
    });

    it('should display correct guest dropdown options', async () => {
      const user = userEvent.setup();
      renderComponent({}, null);

      const guestMenuTrigger = screen.getByRole('button', { name: /Guest menu/i });
      expect(guestMenuTrigger).toBeVisible();
      await user.click(guestMenuTrigger);

      // Verify buttons exist
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeVisible();
      // Dropdown items are inside the button trigger scope in the DOM structure often, 
      // but strictly speaking, "Change language" appears in both Guest Dropdown and User Dropdown.
      // Since we are in Guest View, we just check existence.
      expect(screen.getByRole('button', { name: 'Change language' })).toBeVisible();
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
      expect(screen.queryByRole('link', { name: /Kolibri Logo/i })).not.toBeInTheDocument();
    });

    it('should show correct user dropdown options for non-admin', () => {
      renderComponent({}, defaultUser);

      // We explicitly check items that are unique to the user menu or common
      expect(screen.getByRole('button', { name: 'Settings' })).toBeVisible();
      expect(screen.getByRole('button', { name: 'Help and support' })).toBeVisible();
      expect(screen.getByRole('button', { name: 'Change language' })).toBeVisible();
      expect(screen.getByRole('button', { name: 'Sign out' })).toBeVisible();
      
      expect(screen.queryByRole('button', { name: 'Administration' })).not.toBeInTheDocument();
    });

    it('should show administration option for admin user', () => {
      renderComponent({}, { ...defaultUser, is_admin: true });
      expect(screen.getByRole('button', { name: 'Administration' })).toBeVisible();
    });

    it('should call logout action when Sign out is clicked', async () => {
      const user = userEvent.setup();
      renderComponent({}, defaultUser);

      const logoutBtn = screen.getByRole('button', { name: 'Sign out' });
      await user.click(logoutBtn);

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

      const dialog = screen.getByRole('dialog', { name: /Navigation menu/i });
      expect(dialog).toBeVisible();
      
      // FIX 1: Ambiguous "Kolibri Studio" text (Title in bar vs Title in panel)
      // We check that the title exists specifically INSIDE the dialog
      expect(within(dialog).getByText('Kolibri Studio')).toBeVisible();
    });

    it('should display correct navigation links in side panel', async () => {
      const user = userEvent.setup();
      renderComponent({}, defaultUser);

      await user.click(screen.getByRole('button', { name: /Open navigation menu/i }));

      const dialog = screen.getByRole('dialog', { name: /Navigation menu/i });
      
      // FIX 2: Ambiguous "Settings" text (Button in User Dropdown vs Link in Side Panel)
   
      const sidePanel = within(dialog);

      expect(sidePanel.getByText('Channels')).toBeVisible();
      expect(sidePanel.getByText('Settings')).toBeVisible();
      expect(sidePanel.getByText('Help and support')).toBeVisible();
      expect(sidePanel.getByText('Sign out')).toBeVisible();
    });

    it('should trigger Language Modal from side panel', async () => {
        const user = userEvent.setup();
        renderComponent({}, defaultUser);
  
        await user.click(screen.getByRole('button', { name: /Open navigation menu/i }));
        
        const dialog = screen.getByRole('dialog', { name: /Navigation menu/i });
        const sidePanel = within(dialog);

        // FIX 3: Ambiguous "Change language" text
        // Scope to side panel
        const changeLangLink = sidePanel.getByText('Change language');
        await user.click(changeLangLink);

        expect(screen.getByText('Language Modal')).toBeVisible();
    });
  });

  describe('navigation tabs', () => {
    const tabs = [
      { id: '1', label: 'My Channels', to: { name: 'channels' } },
      { id: '2', label: 'Content Library', to: { name: 'library' } },
    ];

    it('should render navigation tabs when provided', () => {
      renderComponent({ tabs }, null);

      expect(screen.getByText('My Channels')).toBeVisible();
      expect(screen.getByText('Content Library')).toBeVisible();
    });
  });
});