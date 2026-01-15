import { render, screen, fireEvent, waitFor } from '@testing-library/vue';
import VueRouter from 'vue-router';
import { createLocalVue } from '@vue/test-utils';
import ResetPassword from '../resetPassword/ResetPassword';

const localVue = createLocalVue();
localVue.use(VueRouter);

const setPasswordMock = jest.fn(() => Promise.resolve());

const renderComponent = (queryParams = {}) => {
  const router = new VueRouter({
    routes: [
      { path: '/', name: 'Main' },
      { path: '/reset-password', name: 'ResetPassword' },
      { path: '/reset-password/success', name: 'ResetPasswordSuccess' },
    ],
  });
  if (Object.keys(queryParams).length > 0) {
    router.replace({ name: 'ResetPassword', query: queryParams }).catch(() => {});
  }
  const utils = render(ResetPassword, {
    localVue,
    router,
    mocks: {
      $tr: key => {
        const translations = {
          passwordLabel: 'New Password',
          passwordConfirmLabel: 'Confirm Password',
          submitButton: 'Submit',
          resetPasswordFailed: 'Failed to reset password. Please try again.',
          passwordValidationMessage: 'Password should be at least 8 characters long',
          passwordMatchMessage: "Passwords don't match",
        };
        return translations[key] || key;
      },
    },
    store: {
      modules: {
        account: {
          namespaced: true,
          actions: {
            setPassword: setPasswordMock,
          },
        },
      },
    },
  });

  return { ...utils, router };
};

describe('ResetPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows validation errors when submitting invalid or mismatching passwords', async () => {
    renderComponent();

    await fireEvent.update(screen.getByLabelText(/New password/i), 'short');
    await fireEvent.update(screen.getByLabelText(/Confirm password/i), 'mismatched');
    await fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

    expect(setPasswordMock).not.toHaveBeenCalled();

    await screen.findByText('Password should be at least 8 characters long');
    await screen.findByText("Passwords don't match");
  });

  it('submits form with correct data and preserves query params', async () => {
    setPasswordMock.mockResolvedValue({});
    const queryParams = { token: 'xyz123', email: 'test@example.com' };
    const { router } = renderComponent(queryParams);

    await fireEvent.update(screen.getByLabelText(/New password/i), 'validPassword123');
    await fireEvent.update(screen.getByLabelText(/Confirm password/i), 'validPassword123');

    await fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

    await waitFor(() => {
      expect(setPasswordMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...queryParams,
          new_password1: 'validPassword123',
          new_password2: 'validPassword123',
        }),
      );
    });

    await waitFor(() => {
      expect(router.currentRoute.name).toBe('ResetPasswordSuccess');
    });
  });
});
