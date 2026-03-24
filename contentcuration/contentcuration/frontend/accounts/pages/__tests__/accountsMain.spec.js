import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import AccountsMain from '../AccountsMain.vue';

window.Urls = {
  channels: () => '/channels/',
};

const originalLocation = window.location;

const createRouter = () => {
  return new VueRouter({
    mode: 'abstract',
    routes: [
      { path: '/', name: 'Main', component: { template: '<div />' } },
      { path: '/forgot-password', name: 'ForgotPassword', component: { template: '<div />' } },
      { path: '/create', name: 'Create', component: { template: '<div />' } },
      {
        path: '/account-not-active',
        name: 'AccountNotActivated',
        component: { template: '<div />' },
      },
    ],
  });
};

function makeWrapper({ loginMock = jest.fn(), online = true, nextParam = null } = {}) {
  const router = createRouter();

  delete window.location;
  window.location = {
    ...originalLocation,
    search: nextParam ? `?next=${nextParam}` : '',
    assign: jest.fn(),
  };

  return {
    ...render(AccountsMain, {
      routes: router,
      stubs: ['PolicyModals'],
      mocks: {
        $store: {
          state: {
            connection: {
              online,
            },
          },
          dispatch: loginMock,
        },
      },
    }),
    router,
    loginMock,
  };
}

describe('AccountsMain', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it('should render sign-in form with email, password fields and sign in button', () => {
    makeWrapper();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should show error when submitting empty form', async () => {
    makeWrapper();
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // User sees validation errors (from EmailField and PasswordField components)
    await waitFor(() => {
      const errorMessages = screen.queryAllByText(/required|field is required/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  it('should show error message when login fails', async () => {
    const loginMock = jest.fn().mockRejectedValue({
      response: { status: 401 },
    });
    makeWrapper({ loginMock });

    await user.type(screen.getByLabelText(/email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // User sees error banner
    await waitFor(() => {
      expect(screen.getByText('Email or password is incorrect')).toBeInTheDocument();
    });
  });

  it('should redirect to channels page after successful login', async () => {
    const loginMock = jest.fn().mockResolvedValue();
    makeWrapper({ loginMock });

    await user.type(screen.getByLabelText(/email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/password/i), 'testpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // User is redirected to channels page
    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith('/channels/');
    });
  });

  it('should show "You must sign in" banner when ?next= param is present', () => {
    makeWrapper({ nextParam: '/protected-page/' });

    expect(screen.getByText('You must sign in to view that page')).toBeInTheDocument();
  });

  it('should redirect to next URL when provided after successful login', async () => {
    const loginMock = jest.fn().mockResolvedValue();
    const nextUrl = '/protected-page/';
    makeWrapper({ loginMock, nextParam: nextUrl });

    await user.type(screen.getByLabelText(/email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/password/i), 'testpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // User is redirected to next URL
    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith(nextUrl);
    });
  });

  it('should navigate to AccountNotActivated when account is not activated', async () => {
    const loginMock = jest.fn().mockRejectedValue({
      response: { status: 405 },
    });
    const { router } = makeWrapper({ loginMock });

    await user.type(screen.getByLabelText(/email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/password/i), 'testpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // User is redirected to account not activated page
    await waitFor(() => {
      expect(router.currentRoute.name).toBe('AccountNotActivated');
    });
  });

  it('should disable sign in button when offline', () => {
    makeWrapper({ online: false });

    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
  });
});
