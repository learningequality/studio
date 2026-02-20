import { render, screen, fireEvent, waitFor } from '@testing-library/vue';
import VueRouter from 'vue-router';
import { createLocalVue } from '@vue/test-utils';
import ForgotPassword from '../resetPassword/ForgotPassword';

const localVue = createLocalVue();
localVue.use(VueRouter);

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
    localVue,
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
  });

  it('should not submit form with empty email', async () => {
    renderComponent();
    await fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(sendPasswordResetLinkMock).not.toHaveBeenCalled();
  });

  it('should not submit form with invalid email', async () => {
    renderComponent();
    await fireEvent.update(screen.getByLabelText(/email/i), 'invalid-email');
    await fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(sendPasswordResetLinkMock).not.toHaveBeenCalled();
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
    expect(await screen.findByTestId('error-banner')).toBeInTheDocument();
  });
});
