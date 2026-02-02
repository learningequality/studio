import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import StudioNavigationTab from '../StudioNavigation/StudioNavigationTab.vue';

const localVue = createLocalVue();
localVue.use(VueRouter);

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
        path: '/settings',
        name: 'settings',
        component: { template: '<div>Settings</div>' },
      },
    ],
  });
};

const renderComponent = async (options = {}) => {
  const router = createRouter();

  if (options.initialRoute) {
    await router.push(options.initialRoute);
  }

  const props = options.props || {};
  const mocks = {
    $formatNumber: jest.fn(num => num.toString()),
    ...options.mocks,
  };

  const result = render(StudioNavigationTab, {
    localVue,
    router,
    props,
    mocks,
    slots: options.slots || {},
    ...options,
  });

  return { ...result, router };
};

describe('StudioNavigationTab', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  describe('User visible behavior', () => {
    it('should display tab with label', async () => {
      await renderComponent({
        props: { to: { name: 'channels' } },
        slots: { default: 'Channels' },
      });

      expect(screen.getByRole('link', { name: 'Channels' })).toBeInTheDocument();
    });

    it('should show badge number when present', async () => {
      await renderComponent({
        props: {
          to: { name: 'channels' },
          badgeValue: 5,
        },
        slots: { default: 'Channels' },
      });

      expect(screen.getByRole('link', { name: /Channels 5/ })).toBeInTheDocument();
    });

    it('should not show badge when value is zero', async () => {
      await renderComponent({
        props: {
          to: { name: 'channels' },
          badgeValue: 0,
        },
        slots: { default: 'Channels' },
      });

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('should show active indicator when on current page', async () => {
      await renderComponent({
        props: { to: { name: 'channels' } },
        slots: { default: 'Channels' },
        initialRoute: '/channels',
      });

      const link = screen.getByRole('link', { name: 'Channels' });
      expect(link).toHaveAttribute('aria-current', 'Navigation');
    });

    it('should not show active indicator when not on current page', async () => {
      await renderComponent({
        props: { to: { name: 'channels' } },
        slots: { default: 'Channels' },
        initialRoute: '/settings',
      });

      const link = screen.getByRole('link', { name: 'Channels' });
      expect(link).not.toHaveAttribute('aria-current');
    });

    it('should navigate when clicked', async () => {
      const { router } = await renderComponent({
        props: { to: { name: 'settings' } },
        slots: { default: 'Settings' },
        initialRoute: '/channels',
      });

      const link = screen.getByRole('link', { name: 'Settings' });
      await user.click(link);

      expect(router.currentRoute.name).toBe('settings');
    });
  });
});
