import { render, screen, cleanup } from '@testing-library/vue';
import { createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import StudioNavigationOption from '../StudioNavigation/StudioNavigationOption.vue';

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
});
