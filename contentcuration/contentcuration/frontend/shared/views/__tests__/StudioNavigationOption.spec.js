import { render, screen, cleanup } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import StudioNavigationOption from '../StudioNavigationOption.vue';

const localVue = createLocalVue();
localVue.use(VueRouter);

const validIcons = {
  settings: 'settings',
  home: 'home',
  language: 'language',
  logout: 'logout',
  openNewTab: 'openNewTab',
};

const renderComponent = (props = {}, options = {}) => {
  const router = new VueRouter({
    mode: 'abstract',
    routes: [
      {
        path: '/settings',
        name: 'settings',
        component: { template: '<div>Settings</div>' },
      },
      {
        path: '/channels',
        name: 'channels',
        component: { template: '<div>Channels</div>' },
      },
    ],
  });

  return render(StudioNavigationOption, {
    localVue,
    router,
    props,
    ...options,
  });
};

describe('StudioNavigationOption', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Basic rendering', () => {
    it('should render with label and icon', () => {
      renderComponent({
        label: 'Settings',
        icon: validIcons.settings,
      });

      expect(screen.getByText('Settings')).toBeInTheDocument();
      const menuItem = screen.getByRole('menuitem', { name: 'Settings' });
      expect(menuItem).toBeInTheDocument();
      expect(menuItem).toHaveClass('studio-navigation-option');
    });

    it('should render with slot content', () => {
      renderComponent({
        icon: validIcons.settings,
      }, {
        slots: {
          default: '<span>Custom Slot Content</span>',
        },
      });

      expect(screen.getByText('Custom Slot Content')).toBeInTheDocument();
    });
  });

  describe('Link behavior', () => {
    it('should render as a link with href when link prop is provided', () => {
      renderComponent({
        label: 'Channels',
        icon: validIcons.home,
        link: '/channels',
      });

      const link = screen.getByRole('menuitem', { name: 'Channels' });
      expect(link).toHaveAttribute('href', '/channels');
      expect(link.tagName).toBe('A');
    });

    it('should not have href when link prop is not provided', () => {
      renderComponent({
        label: 'Change Language',
        icon: validIcons.language,
        link: null,
      });

      const link = screen.getByRole('menuitem', { name: 'Change Language' });
      expect(link).not.toHaveAttribute('href');
    });
  });

  describe('Click handling', () => {
    it('should emit select event when clicked without link', async () => {
      const { emitted } = renderComponent({
        label: 'Logout',
        icon: validIcons.logout,
        link: null,
      });

      const menuItem = screen.getByRole('menuitem', { name: 'Logout' });
      await user.click(menuItem);

      expect(emitted().select).toHaveLength(1);
      expect(emitted().click).toHaveLength(1);
    });

    it('should handle Enter key press', async () => {
      const { emitted } = renderComponent({
        label: 'Change Language',
        icon: validIcons.language,
        link: null,
      });

      const menuItem = screen.getByRole('menuitem', { name: 'Change Language' });
      menuItem.focus();
      await user.keyboard('{Enter}');

      expect(emitted().select).toHaveLength(1);
      expect(emitted().click).toHaveLength(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderComponent({
        label: 'Settings',
        icon: validIcons.settings,
      });

      const menuItem = screen.getByRole('menuitem', { name: 'Settings' });
      expect(menuItem).toHaveAttribute('tabindex', '0');
      expect(menuItem).toHaveAttribute('role', 'menuitem');
    });
  });

  describe('Icon handling', () => {
    it('should render disabled icon button', () => {
      renderComponent({
        label: 'Settings',
        icon: validIcons.settings,
      });
      const buttons = screen.getAllByRole('button');
      const disabledButton = buttons.find(button => button.disabled);
      expect(disabledButton).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should render without label', () => {
      renderComponent({
        icon: validIcons.settings,
        label: '',
      });

      // Use getAllByRole and check first one
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems[0]).toBeInTheDocument();
    });

    it('should handle empty string link', () => {
      renderComponent({
        label: 'External Link',
        icon: validIcons.openNewTab,
        link: '',
      });

      const menuItem = screen.getByRole('menuitem', { name: 'External Link' });
      expect(menuItem).toHaveAttribute('href', '');
    });

    it('should handle external links', () => {
      const externalLink = 'https://external.example.com';
      renderComponent({
        label: 'External',
        icon: validIcons.openNewTab,
        link: externalLink,
      });

      const menuItem = screen.getByRole('menuitem', { name: 'External' });
      expect(menuItem).toHaveAttribute('href', externalLink);
    });
  });
});