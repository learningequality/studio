import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import StudioNavigation from 'shared/views/StudioNavigation.vue';

// 1. Mock Global Objects
window.Urls = {
  channels: () => '/channels/',
  administration: () => '/administration/',
  settings: () => '/settings/',
};

// 2. Mock Responsive Window
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => ({
  __esModule: true,
  default: () => ({ windowBreakpoint: 4 }),
}));

// 3. Mock Layout (Fixes title truncation logic)
Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
  configurable: true,
  get() { return 1000; },
});

const createRouter = () => {
  return new VueRouter({
    mode: 'abstract',
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/channels', name: 'channels', component: { template: '<div />' } },
      { path: '/settings', name: 'settings', component: { template: '<div />' } },
      { path: '/administration', name: 'administration', component: { template: '<div />' } },
    ],
  });
};

function makeWrapper({ 
  props = {}, 
  loggedIn = true, 
  isAdmin = false, 
  user = { first_name: 'TestUser', is_admin: isAdmin } 
} = {}) {
  const router = createRouter();

  return render(StudioNavigation, {
    props: {
      title: 'Test Studio',
      tabs: [],
      ...props,
    },
    routes: router,
    router,
    mocks: {
      $store: {
        state: { session: { currentUser: user } },
        getters: { loggedIn: () => loggedIn },
      },
      // Translation Mock: Returns real text so we can assert exact matches
      $tr: (key) => {
        const map = {
          copyright: '© 2025 Learning Equality',
          giveFeedback: 'Give feedback',
          logIn: 'Sign in',
          settings: 'Settings',
          changeLanguage: 'Change language',
          help: 'Help and support',
          logOut: 'Sign out',
          administration: 'Administration',
          settingsLink: 'Settings',
          openMenu: 'openMenu',
          closePanel: 'closePanel'
        };
        return map[key] || key;
      },
      $themeTokens: { appBar: 'white', text: 'black' },
      $analytics: { trackClick: jest.fn() },
      $computedClass: () => {},
      $formatNumber: (n) => n,
    },
    
  });
}

describe('StudioNavigation', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  describe('General Rendering', () => {
    it('renders the title provided in props', () => {
      makeWrapper({ props: { title: 'My Custom Title' } });
      expect(screen.getByText('My Custom Title')).toBeInTheDocument();
    });

    it('renders the hamburger menu when logged in', () => {
      makeWrapper({ loggedIn: true });
      expect(screen.getByLabelText('openMenu')).toBeInTheDocument();
    });

    it('renders the logo instead of hamburger when logged out', () => {
      makeWrapper({ loggedIn: false });
      expect(screen.queryByLabelText('openMenu')).not.toBeInTheDocument();
      expect(screen.getByAltText('Kolibri Logo')).toBeInTheDocument();
    });
  });

  describe('User Menu (Dropdown)', () => {
    it('shows correct options for a Logged In User', () => {
      makeWrapper({ loggedIn: true, isAdmin: false });
      
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Change language')).toBeInTheDocument();
      expect(screen.getByText('Help and support')).toBeInTheDocument();
      expect(screen.getByText('Sign out')).toBeInTheDocument();
      
      // Admin link should NOT be present
      expect(screen.queryByText('Administration')).not.toBeInTheDocument();
    });

    it('shows correct options for an Admin User', () => {
      makeWrapper({ loggedIn: true, isAdmin: true });
      expect(screen.getByText('Administration')).toBeInTheDocument();
    });

    it('shows correct options for a Guest (Logged Out)', () => {
      makeWrapper({ loggedIn: false });
      expect(screen.getByText('Sign in')).toBeInTheDocument();
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });
  });

  describe('Side Panel', () => {
    it('opens and closes the side panel (Toggle Test)', async () => {
      makeWrapper({ loggedIn: true });

      // 1. Initially Closed
      expect(screen.queryByTestId('side-panel')).not.toBeInTheDocument();

      // 2. Open: Click Hamburger
      const hamburger = screen.getByLabelText('openMenu');
      await user.click(hamburger);
      expect(screen.getByTestId('side-panel')).toBeInTheDocument();

      // 3. Close: Click the close button
      const closeButton = screen.getByLabelText('closePanel');
      await user.click(closeButton);
      
      // 4. Assert Closed
      expect(screen.queryByTestId('side-panel')).not.toBeInTheDocument();
    });

    it('closes the side panel when a navigation link is clicked', async () => {
      makeWrapper({ loggedIn: true });
      
      // Open Panel
      await user.click(screen.getByLabelText('openMenu'));
      expect(screen.getByTestId('side-panel')).toBeInTheDocument();

      // Click a link (e.g., Settings)
      await user.click(screen.getByText('Settings'));

      // Assert Closed
      expect(screen.queryByTestId('side-panel')).not.toBeInTheDocument();
    });

    it('renders the footer links correctly', async () => {
      makeWrapper({ loggedIn: true });
      await user.click(screen.getByLabelText('openMenu'));

      // Copyright
      const copyright = screen.getByText('© 2025 Learning Equality');
      expect(copyright).toBeInTheDocument();
      expect(copyright).toHaveAttribute('href', 'https://learningequality.org/');

      // Feedback
      const feedback = screen.getByText('Give feedback');
      expect(feedback).toBeInTheDocument();
      expect(feedback).toHaveAttribute('href', 'https://community.learningequality.org/c/support/studio');
    });
  });
});