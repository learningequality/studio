import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import AccountsMain from '../AccountsMain.vue';
import { redirectBrowser } from 'shared/utils/navigation';

jest.mock('shared/utils/navigation', () => ({
  redirectBrowser: jest.fn(),
}));

window.Urls = {
  channels: () => '/channels/',
};

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

  // Use pushState to set search params without triggering jsdom navigation
  const url = nextParam ? `http://studio.time/?next=${nextParam}` : 'http://studio.time/';
  window.history.pushState({}, '', url);

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
    jest.clearAllMocks();
    window.history.pushState({}, '', 'http://studio.time/');
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

    // User sees validation errors (from StudioEmailField and StudioPasswordField components)
    await waitFor(() => {
      const errorMessages = screen.queryAllByText(/required|field is required/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  it('should not attempt to log in when the form is invalid', async () => {
    const loginMock = jest.fn();
    makeWrapper({ loginMock });

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(loginMock).not.toHaveBeenCalled();
  });

  it('should move focus to the email field when it is the first invalid field', async () => {
    makeWrapper();
    const emailField = screen.getByLabelText(/email/i);

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(emailField).toHaveFocus();
    });
  });

  it('should move focus to the password field when only it is invalid', async () => {
    makeWrapper();
    const passwordField = screen.getByLabelText(/password/i);

    await user.type(screen.getByLabelText(/email/i), 'test@test.com');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(passwordField).toHaveFocus();
    });
  });

  it('should not show the email error while the user is still typing', async () => {
    makeWrapper();

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');

    expect(screen.queryByText('Please enter a valid email')).not.toBeInTheDocument();
  });

  it('should show the email error once the field loses focus', async () => {
    makeWrapper();
    const emailField = screen.getByLabelText(/email/i);

    await user.type(emailField, 'not-an-email');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
    });
  });

  it('should show and announce the offline banner when offline', () => {
    makeWrapper({ online: false });

    expect(screen.getByRole('alert')).toHaveTextContent(/you seem to be offline/i);
  });

  it('should preserve leading and trailing whitespace in the password', async () => {
    const loginMock = jest.fn().mockResolvedValue();
    makeWrapper({ loginMock });

    await user.type(screen.getByLabelText(/email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/password/i), '  spaced  ');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('login', {
        username: 'test@test.com',
        password: '  spaced  ',
      });
    });
  });

  it('should show and announce login failure to screen readers', async () => {
    const loginMock = jest.fn().mockRejectedValue({
      response: { status: 401 },
    });
    makeWrapper({ loginMock });

    await user.type(screen.getByLabelText(/email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Email or password is incorrect');
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
      expect(redirectBrowser).toHaveBeenCalledWith('/channels/');
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
      expect(redirectBrowser).toHaveBeenCalledWith(nextUrl);
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
