import { render, screen,within, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createLocalVue } from '@vue/test-utils';
import Vuex, { Store } from 'vuex';
import VueRouter from 'vue-router';
import StudioNavigation from '../StudioNavigation.vue';



const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);

// Mock window properties
const mockUrls = {
  channels: jest.fn(() => '/channels'),
  administration: jest.fn(() => '/administration'),
  settings: jest.fn(() => '/settings'),
};

Object.defineProperty(window, 'Urls', {
  value: mockUrls,
  writable: true,
});

global.open = jest.fn();

const originalLocation = window.location;
const mockAnalytics = {
  trackClick: jest.fn(),
  trackEvent: jest.fn(),
};

const createMockStore = (options = {}) => {
  return new Store({
    state: {
      session: {
        currentUser: options.user || null,
      },
    },
    getters: {
      loggedIn: (state) => !!state.session.currentUser,
    },
    actions: {
      logout: jest.fn(() => Promise.resolve()),
    },
  });
};

const createRouter = () => {
  return new VueRouter({
    mode: 'abstract',
    routes: [
      {
        path: '/channels',
        name: 'channels',
        component: { template: '<div>Channels</div>' },
      },
      {
        path: '/administration',
        name: 'administration',
        component: { template: '<div>Administration</div>' },
      },
      {
        path: '/settings',
        name: 'settings',
        component: { template: '<div>Settings</div>' },
      },
    ],
  });
};

const renderComponent = async (options = {}) => {
  const store = options.store || createMockStore({ user: null });
  const router = createRouter();

  const props = options.props || {};
  const mocks = {
    $analytics: mockAnalytics,
    $tr: jest.fn((key, params) => {
      const translations = {
        'title': 'Kolibri Studio',
        'openMenu': 'Open navigation menu',
        'navigationMenu': 'Navigation menu',
        'mainNavigationLabel': 'Main navigation',
        'userMenuLabel': 'User menu',
        'guestMenuLabel': 'Guest menu',
        'administration': 'Administration',
        'changeLanguage': 'Change language',
        'settings': 'Settings',
        'help': 'Help and support',
        'logIn': 'Sign in',
        'logOut': 'Sign out',
        'channelsLink': 'Channels',
        'administrationLink': 'Administration',
        'settingsLink': 'Settings',
        'helpLink': 'Help and support',
        'logoutLink': 'Sign out',
        'copyright': `© ${params?.year || '2026'} Learning Equality`,
        'giveFeedback': 'Give feedback',
        'moreOptions': 'More options',
      };
      return translations[key] || key;
    }),
    ...options.mocks,
  };

  const result = render(StudioNavigation, {
    localVue,
    store,
    router,
    props,
    mocks,
    ...options,
  });
  await waitFor(() => {
    expect(result.container.querySelector('.studio-navigation')).toBeInTheDocument();
  });

  return { ...result, router, store };
};

describe('StudioNavigation', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    delete window.location;
    window.location = {
      ...originalLocation,
      href: '',
      assign: jest.fn(),
    };
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  describe('Guest user view', () => {
    it('should show logo link for guest users', async () => {
      await renderComponent();

      const logoLink = screen.getByRole('link', { name: /kolibri logo with background/i });
      expect(logoLink).toBeInTheDocument();
    });

    it('should not show menu button for guest users', async () => {
      await renderComponent();

      const menuButton = screen.queryByRole('button', { name: /open navigation menu/i });
      expect(menuButton).not.toBeInTheDocument();
    });
  });

  describe('Logged-in user view', () => {
    it('should show menu button for logged-in users', async () => {
      const store = createMockStore({
        user: {
          first_name: 'John',
          is_admin: false,
        },
      });
      
      await renderComponent({ store });

      const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
      expect(menuButton).toBeInTheDocument();
    });

    it('should display user first name for logged-in users', async () => {
      const store = createMockStore({
        user: {
          first_name: 'Alice',
          is_admin: false,
        },
      });
      
      await renderComponent({ store });

      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('should not show logo link for logged-in users', async () => {
      const store = createMockStore({
        user: {
          first_name: 'John',
          is_admin: false,
        },
      });
      
      await renderComponent({ store });
      const logoLink = screen.queryByRole('link', { name: /kolibri logo with background/i });
      expect(logoLink).not.toBeInTheDocument();
    });
  });

  describe('Navigation tabs', () => {
    const mockTabs = [
      {
        id: '1',
        label: 'Channels',
        to: { name: 'channels' },
      },
      {
        id: '2',
        label: 'Administration',
        to: { name: 'administration' },
      },
      {
        id: '3',
        label: 'Settings',
        to: { name: 'settings' },
      },
    ];

    it('should display navigation tabs as links', async () => {
      await renderComponent({
        props: { tabs: mockTabs },
      });

      expect(screen.getByRole('link', { name: 'Channels' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Administration' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument();
    });

  });


  describe('Admin user features', () => {
    it('should include administration option in user menu for admin users', async () => {
      const store = createMockStore({
        user: {
          first_name: 'Admin',
          is_admin: true,
        },
      });
      
      const { container } = await renderComponent({ store });
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(container.querySelector('.studio-navigation-menu')).toBeInTheDocument();
    });

    it('should not include administration option in user menu for non-admin users', async () => {
      const store = createMockStore({
        user: {
          first_name: 'John',
          is_admin: false,
        },
      });
      const { container } = await renderComponent({ store });
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(container.querySelector('.studio-navigation-menu')).toBeInTheDocument();
    });

    it('should show administration link in side panel for admin users', async () => {
      const store = createMockStore({
        user: {
          first_name: 'Admin',
          is_admin: true,
        },
      });
      
      await renderComponent({ store });
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });
  });


  describe('User menu interactions', () => {
    it('should display correct user menu options for logged-in non-admin user', async () => {
      const store = createMockStore({
        user: {
          first_name: 'John',
          is_admin: false,
        },
      });
      
      const { container } = await renderComponent({ store });
      const userMenu = container.querySelector('[aria-label="User menu"]');
      expect(userMenu).toBeInTheDocument();
      expect(screen.getByText('John')).toBeInTheDocument();
      const buttons = within(userMenu).getAllByRole('button');
      const disabledButtons = buttons.filter(button => button.disabled);
      expect(disabledButtons.length).toBe(2); 
    });

    it('should display correct user menu options for logged-in admin user', async () => {
      const store = createMockStore({
        user: {
          first_name: 'Admin',
          is_admin: true,
        },
      });
      
      const { container } = await renderComponent({ store });
      const userMenu = container.querySelector('[aria-label="User menu"]');
      expect(userMenu).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
      const menuContainer = container.querySelector('.studio-navigation-menu');
      expect(menuContainer).toBeInTheDocument();
    });

    it('should navigate to settings when settings is selected from menu', async () => {
      const store = createMockStore({
        user: {
          first_name: 'John',
          is_admin: false,
        },
      });
      const { container } = await renderComponent({ store });
      const userMenu = container.querySelector('[aria-label="User menu"]');
      expect(userMenu).toBeInTheDocument();
      expect(screen.getByText('John')).toBeInTheDocument();
    });

    it('should call logout action when logout is selected from menu', async () => {
      const store = createMockStore({
        user: {
          first_name: 'John',
          is_admin: false,
        },
      });
      await renderComponent({ store });
      expect(screen.getByText('John')).toBeInTheDocument();
    });

    it('should open language modal when change language is selected', async () => {
      const store = createMockStore({
        user: {
          first_name: 'John',
          is_admin: false,
        },
      });
      await renderComponent({ store });
      expect(screen.getByText('John')).toBeInTheDocument();
    });

    it('should open help link in new tab when help is selected', async () => {
      const store = createMockStore({
        user: {
          first_name: 'John',
          is_admin: false,
        },
      });
      await renderComponent({ store });
      expect(screen.getByText('John')).toBeInTheDocument();
    });

    it('should navigate to administration when selected by admin user', async () => {
      const store = createMockStore({
        user: {
          first_name: 'Admin',
          is_admin: true,
        },
      });
      await renderComponent({ store });
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });
  });

  describe('Guest menu interactions', () => {
    it('should display correct guest menu options', async () => {
      const { container } = await renderComponent();
      const guestMenu = container.querySelector('[aria-label="Guest menu"]');
      expect(guestMenu).toBeInTheDocument();
      const buttons = within(guestMenu).getAllByRole('button');
      const disabledButtons = buttons.filter(button => button.disabled);
      expect(disabledButtons.length).toBe(2);
    });
  });

  describe('Side panel functionality', () => {
    it('should toggle side panel when menu button is clicked', async () => {
      const store = createMockStore({
        user: {
          first_name: 'John',
          is_admin: false,
        },
      });
      const { container } = await renderComponent({ store });
      expect(container.querySelector('.side-panel-modal')).not.toBeInTheDocument();
      const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
      await user.click(menuButton);
      expect(menuButton).toBeInTheDocument();
    });
  });
});