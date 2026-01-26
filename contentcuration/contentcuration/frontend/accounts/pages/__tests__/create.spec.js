import VueRouter from 'vue-router';
import Vuex from 'vuex';
import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import Create from '../Create';

const routes = [
  { path: '/', name: 'Main' },
  { path: '/create', name: 'Create' },
  { path: '/activation-sent' },
  { path: '/account-created' },
  { path: '/account-not-active' },
  { path: '/activation-expired' },
  { path: '/request-activation-link' },
  { path: '/activation-resent' },
  { path: '/forgot-password' },
  { path: '/reset-password' },
  { path: '/password-reset-sent' },
  { path: '/password-reset-success' },
  { path: '/reset-expired' },
  { path: '/account-deleted' },
  { path: '*', redirect: '/' },
];

const mockRegisterAction = jest.fn().mockResolvedValue({});

const makeStore = ({ offline = false } = {}) =>
  new Vuex.Store({
    state: {
      connection: {
        online: !offline,
      },
    },
    actions: {
      register: mockRegisterAction,
    },
  });

const renderComponent = async ({ routeQuery = {}, offline = false } = {}) => {
  const router = new VueRouter({ routes });
  await router.push({ name: 'Create', query: routeQuery }).catch(() => {});

  return render(Create, {
    router,
    store: makeStore({ offline }),
    stubs: {
      PolicyModals: true,
    },
  });
};

describe('Create account page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('renders the page', async () => {
    await renderComponent();

    expect(await screen.findByRole('heading', { name: /create an account/i })).toBeInTheDocument();
  });

  test("doesn't call register action when fields are empty", async () => {
    await renderComponent();

    const finishButton = screen.getByRole('button', { name: /finish/i });
    await userEvent.click(finishButton);

    expect(mockRegisterAction).not.toHaveBeenCalled();
  });

  test('automatically fills the email field when provided in the URL', async () => {
    await renderComponent({
      routeQuery: { email: 'newtest@test.com' },
    });

    const emailInput = await screen.findByLabelText(/email/i);

    await waitFor(() => {
      expect(emailInput).toHaveValue('newtest@test.com');
    });
  });

  describe('password validation', () => {
    test('shows error when password is too short', async () => {
      await renderComponent();
      const passwordInput = screen.getByLabelText(/^password$/i);
      await userEvent.type(passwordInput, '123');
      await userEvent.tab();

      expect(
        await screen.findByText(/password should be at least 8 characters long/i),
      ).toBeInTheDocument();
    });

    test('shows error when passwords do not match', async () => {
      await renderComponent();
      await userEvent.type(screen.getByLabelText(/^password$/i), 'tester123');
      await userEvent.type(screen.getByLabelText(/confirm password/i), 'different456');
      await userEvent.tab();

      expect(await screen.findByText(/passwords don't match/i)).toBeInTheDocument();
    });
  });

  // NOTE:
  // Full form submission tests are intentionally skipped here.
  //
  // This page still relies on Vuetify components (v-select / v-autocomplete)
  // for required fields such as "locations" and "source".
  // These components do not reliably update their v-model state when interacted
  // with via Vue Testing Library’s userEvent APIs, which prevents a fully
  // user-centric submission flow from being exercised.
  //
  // The previous Vue Test Utils tests worked around this by directly mutating
  // component data (setData), which is intentionally avoided when using
  // Testing Library.
  //
  // These tests will be re-enabled once this page is migrated to the
  // Kolibri Design System as part of the Vuetify removal effort .
  test.skip('creates an account when the user submits valid information', async () => {
    await renderComponent();

    await userEvent.type(screen.getByLabelText(/first name/i), 'Test');
    await userEvent.type(screen.getByLabelText(/last name/i), 'User');
    await userEvent.type(screen.getByLabelText(/email/i), 'test@test.com');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'tester123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'tester123');

    await userEvent.click(screen.getByLabelText(/tagging content sources/i));

    await userEvent.click(screen.getByLabelText(/i have read and agree to terms of service/i));

    const finishButton = screen.getByRole('button', { name: /finish/i });

    await waitFor(() => {
      expect(finishButton).toBeEnabled();
    });

    await userEvent.click(finishButton);

    await waitFor(() => {
      expect(mockRegisterAction).toHaveBeenCalled();
    });
  });

  // Skipped for the same reason as above
  test.skip('shows an offline error when the user is offline', async () => {
    await renderComponent({ offline: true });

    await userEvent.type(screen.getByLabelText(/first name/i), 'Test');
    await userEvent.type(screen.getByLabelText(/last name/i), 'User');
    await userEvent.type(screen.getByLabelText(/email/i), 'test@test.com');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'tester123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'tester123');

    await userEvent.click(screen.getByLabelText(/tagging content sources/i));

    await userEvent.click(screen.getByLabelText(/i have read and agree to terms of service/i));

    const finishButton = screen.getByRole('button', { name: /finish/i });
    await userEvent.click(finishButton);

    expect(await screen.findByText(/offline/i)).toBeInTheDocument();
  });
});
