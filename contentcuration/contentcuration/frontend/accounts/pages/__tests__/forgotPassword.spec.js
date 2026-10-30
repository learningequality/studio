import { render, screen, fireEvent, waitFor } from '@testing-library/vue';
import VueRouter from 'vue-router';
import ForgotPassword from '../resetPassword/ForgotPassword';
import commonStrings from 'shared/translator';

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the forgot password form', () => {
    renderComponent();
    expect(screen.getByText('Reset your password')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    expect(screen.queryByTestId('error-banner')).not.toBeInTheDocument();
  });

  it('should not submit form with empty email', async () => {
    renderComponent();
    await fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => {
      expect(screen.getByTestId('email-field')).toHaveTextContent(
        commonStrings.$tr('fieldRequired'),
      );
    });
    expect(sendPasswordResetLinkMock).not.toHaveBeenCalled();
  });

  it('should not submit form with invalid email', async () => {
    renderComponent();
    await fireEvent.update(screen.getByLabelText(/email/i), 'invalid-email');
    await fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => {
      expect(screen.getByTestId('email-field')).toHaveTextContent(
        ForgotPassword.$trs.emailValidationMessage,
      );
    });
    expect(sendPasswordResetLinkMock).not.toHaveBeenCalled();
  });

  it('should not show validation error while typing', async () => {
    renderComponent();
    await fireEvent.update(screen.getByLabelText(/email/i), 'invalid-email');
    expect(screen.getByTestId('email-field')).not.toHaveTextContent(
      ForgotPassword.$trs.emailValidationMessage,
    );
  });

  it('should show validation error on blur', async () => {
    renderComponent();
    const emailInput = screen.getByLabelText(/email/i);
    await fireEvent.update(emailInput, 'invalid-email');
    await fireEvent.blur(emailInput);
    await waitFor(() => {
      expect(screen.getByTestId('email-field')).toHaveTextContent(
        ForgotPassword.$trs.emailValidationMessage,
      );
    });
  });

  it('should submit form with valid email and navigate to success page', async () => {
    sendPasswordResetLinkMock.mockResolvedValue({});
    const { router } = renderComponent();
    await fireEvent.update(screen.getByLabelText(/email/i), 'test@test.com');
    await fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => {
      expect(sendPasswordResetLinkMock).toHaveBeenCalledTimes(1);
      expect(sendPasswordResetLinkMock).toHaveBeenCalledWith(expect.anything(), 'test@test.com');
    });
    await waitFor(() => {
      expect(router.currentRoute.name).toBe('PasswordInstructionsSent');
    });
  });

  it('should show error banner when submission fails', async () => {
    sendPasswordResetLinkMock.mockRejectedValue(new Error('Failed'));
    renderComponent();
    await fireEvent.update(screen.getByLabelText(/email/i), 'test@test.com');
    await fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByTestId('error-banner')).toHaveTextContent(
      ForgotPassword.$trs.forgotPasswordFailed,
    );
  });
});
