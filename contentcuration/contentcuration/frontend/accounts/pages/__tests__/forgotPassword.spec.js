import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import ForgotPassword from '../resetPassword/ForgotPassword';
import commonStrings from 'shared/translator';
import { createTranslator } from 'shared/i18n';

const { fieldRequired$ } = commonStrings;
const {
  forgotPasswordTitle$,
  emailLabel$,
  submitButton$,
  emailValidationMessage$,
  forgotPasswordFailed$,
} = createTranslator(ForgotPassword.name, ForgotPassword.$trs);

const INVALID_EMAIL = 'invalid-email';
const VALID_EMAIL = 'test@test.com';

const sendPasswordResetLinkMock = jest.fn(() => Promise.resolve());

const renderComponent = () => {
  const router = new VueRouter({
    routes: [
      { path: '/', name: 'Main' },
      { path: '/forgot-password', name: 'ForgotPassword' },
      { path: '/password-instructions-sent', name: 'PasswordInstructionsSent' },
    ],
  });

  const utils = render(ForgotPassword, {
    router,
    store: {
      modules: {
        account: {
          namespaced: true,
          actions: {
            sendPasswordResetLink: sendPasswordResetLinkMock,
          },
        },
      },
    },
  });

  return { ...utils, router };
};

describe('ForgotPassword', () => {
  let user;

  const emailInput = () => screen.getByLabelText(emailLabel$());
  const submitButton = () => screen.getByRole('button', { name: submitButton$() });

  beforeEach(() => {
    jest.clearAllMocks();
    user = userEvent.setup();
  });

  it('should render the forgot password form', () => {
    renderComponent();
    expect(screen.getByText(forgotPasswordTitle$())).toBeInTheDocument();
    expect(emailInput()).toBeInTheDocument();
    expect(submitButton()).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should not submit form with empty email', async () => {
    renderComponent();
    await user.click(submitButton());
    await waitFor(() => {
      expect(screen.getByTestId('email-field')).toHaveTextContent(fieldRequired$());
    });
    expect(sendPasswordResetLinkMock).not.toHaveBeenCalled();
  });

  it('should not submit form with invalid email', async () => {
    renderComponent();
    await user.type(emailInput(), INVALID_EMAIL);
    await user.click(submitButton());
    await waitFor(() => {
      expect(screen.getByTestId('email-field')).toHaveTextContent(emailValidationMessage$());
    });
    expect(sendPasswordResetLinkMock).not.toHaveBeenCalled();
  });

  it('should not show validation error while typing', async () => {
    renderComponent();
    await user.type(emailInput(), INVALID_EMAIL);
    expect(screen.getByTestId('email-field')).not.toHaveTextContent(emailValidationMessage$());
  });

  it('should show validation error on blur', async () => {
    renderComponent();
    await user.type(emailInput(), INVALID_EMAIL);
    await user.tab();
    await waitFor(() => {
      expect(screen.getByTestId('email-field')).toHaveTextContent(emailValidationMessage$());
    });
  });

  it('should submit form with valid email and navigate to success page', async () => {
    sendPasswordResetLinkMock.mockResolvedValue({});
    const { router } = renderComponent();
    await user.type(emailInput(), VALID_EMAIL);
    await user.click(submitButton());
    await waitFor(() => {
      expect(sendPasswordResetLinkMock).toHaveBeenCalledTimes(1);
      expect(sendPasswordResetLinkMock).toHaveBeenCalledWith(expect.anything(), VALID_EMAIL);
    });
    await waitFor(() => {
      expect(router.currentRoute.name).toBe('PasswordInstructionsSent');
    });
  });

  it('should show error banner when submission fails', async () => {
    sendPasswordResetLinkMock.mockRejectedValue(new Error('Failed'));
    renderComponent();
    await user.type(emailInput(), VALID_EMAIL);
    await user.click(submitButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(forgotPasswordFailed$());
  });
});
