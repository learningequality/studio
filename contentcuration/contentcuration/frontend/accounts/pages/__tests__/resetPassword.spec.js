import { render, screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import { createLocalVue } from '@vue/test-utils';
import ResetPassword from '../resetPassword/ResetPassword';
import commonStrings from 'shared/translator';
import { createTranslator } from 'shared/i18n';

const { fieldRequired$ } = commonStrings;
const {
  passwordLabel$,
  passwordConfirmLabel$,
  passwordValidationMessage$,
  passwordMatchMessage$,
  submitButton$,
  resetPasswordFailed$,
} = createTranslator(ResetPassword.name, ResetPassword.$trs);

const localVue = createLocalVue();
localVue.use(VueRouter);

const setPasswordMock = jest.fn(() => Promise.resolve());

const renderComponent = (queryParams = {}) => {
  const router = new VueRouter({
    mode: 'abstract',
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
  let user;

  beforeEach(() => {
    jest.clearAllMocks();
    user = userEvent.setup();
  });

  const newPasswordField = () => screen.getByLabelText(passwordLabel$());
  const confirmPasswordField = () => screen.getByLabelText(passwordConfirmLabel$());
  // KTextbox doesn't link its error text to the input via ARIA, so scope
  // queries to the textbox container that holds both.
  const fieldContainer = field => field.closest('.ui-textbox');
  const errorsIn = field => within(fieldContainer(field));

  it('shows validation errors when submitting invalid or mismatching passwords', async () => {
    renderComponent();

    await user.type(newPasswordField(), 'short');
    await user.type(confirmPasswordField(), 'mismatched');
    await user.click(screen.getByRole('button', { name: submitButton$() }));

    expect(setPasswordMock).not.toHaveBeenCalled();

    expect(
      await errorsIn(newPasswordField()).findByText(passwordValidationMessage$()),
    ).toBeVisible();
    expect(
      await errorsIn(confirmPasswordField()).findByText(passwordMatchMessage$()),
    ).toBeVisible();
  });

  it('submits form with correct data and preserves query params', async () => {
    setPasswordMock.mockResolvedValue({});
    const queryParams = { token: 'xyz123', email: 'test@example.com' };
    const { router } = renderComponent(queryParams);

    await user.type(newPasswordField(), 'validPassword123');
    await user.type(confirmPasswordField(), 'validPassword123');

    await user.click(screen.getByRole('button', { name: submitButton$() }));

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

  describe('validation feedback', () => {
    it('shows the required error when an empty field loses focus', async () => {
      renderComponent();

      await user.click(newPasswordField());
      await user.tab();

      expect(errorsIn(newPasswordField()).getByText(fieldRequired$())).toBeVisible();
      expect(
        errorsIn(confirmPasswordField()).queryByText(fieldRequired$()),
      ).not.toBeInTheDocument();
    });

    it('hides errors while typing and shows them once the field loses focus', async () => {
      renderComponent();

      await user.type(newPasswordField(), 'short');
      expect(
        errorsIn(newPasswordField()).queryByText(passwordValidationMessage$()),
      ).not.toBeInTheDocument();

      await user.tab();
      expect(
        errorsIn(newPasswordField()).getByText(passwordValidationMessage$()),
      ).toBeInTheDocument();
    });

    it('re-checks the confirmation when the new password changes', async () => {
      renderComponent();

      await user.type(newPasswordField(), 'abcdefgh');
      await user.type(confirmPasswordField(), 'abcdefgh');
      await user.tab();
      expect(
        errorsIn(confirmPasswordField()).queryByText(passwordMatchMessage$()),
      ).not.toBeInTheDocument();

      await user.type(newPasswordField(), 'ZZ');
      await user.tab();
      expect(
        errorsIn(confirmPasswordField()).getByText(passwordMatchMessage$()),
      ).toBeInTheDocument();
    });

    it('clears the mismatch error when the new password is changed to match', async () => {
      renderComponent();

      await user.type(newPasswordField(), 'abcdefgh');
      await user.type(confirmPasswordField(), 'abcdefghZZ');
      await user.tab();
      expect(
        errorsIn(confirmPasswordField()).getByText(passwordMatchMessage$()),
      ).toBeInTheDocument();

      await user.type(newPasswordField(), 'ZZ');
      expect(
        errorsIn(confirmPasswordField()).queryByText(passwordMatchMessage$()),
      ).not.toBeInTheDocument();
    });

    it('shows the required error on both fields when submitting an empty form', async () => {
      renderComponent();

      await user.click(screen.getByRole('button', { name: submitButton$() }));

      expect(screen.getAllByText(fieldRequired$())).toHaveLength(2);
      expect(setPasswordMock).not.toHaveBeenCalled();
    });

    it('moves focus to the new password field when it is the first invalid field', async () => {
      renderComponent();

      await user.click(screen.getByRole('button', { name: submitButton$() }));

      await waitFor(() => {
        expect(newPasswordField()).toHaveFocus();
      });
    });

    it('moves focus to the confirmation field when only it is invalid', async () => {
      renderComponent();

      await user.type(newPasswordField(), 'abcdefgh');
      await user.type(confirmPasswordField(), 'mismatch');
      await user.click(screen.getByRole('button', { name: submitButton$() }));

      await waitFor(() => {
        expect(confirmPasswordField()).toHaveFocus();
      });
    });
  });

  it('shows and announces an error banner when resetting the password fails', async () => {
    setPasswordMock.mockRejectedValueOnce(new Error('Invalid token'));
    renderComponent();

    await user.type(newPasswordField(), 'validPassword123');
    await user.type(confirmPasswordField(), 'validPassword123');
    await user.click(screen.getByRole('button', { name: submitButton$() }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(resetPasswordFailed$());
    });
  });

  it('preserves leading and trailing whitespace in the submitted passwords', async () => {
    const PASSWORD_WITH_SPACES = '  spaced password  ';
    renderComponent();

    await user.type(newPasswordField(), PASSWORD_WITH_SPACES);
    await user.type(confirmPasswordField(), PASSWORD_WITH_SPACES);
    await user.click(screen.getByRole('button', { name: submitButton$() }));

    await waitFor(() => {
      expect(setPasswordMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          new_password1: PASSWORD_WITH_SPACES,
          new_password2: PASSWORD_WITH_SPACES,
        }),
      );
    });
  });
});
