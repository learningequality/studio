import VueRouter from 'vue-router';
import Vuex from 'vuex';
import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import Create from '../Create';

// We use a stub for all routes except the one we are testing ('Create').
// This ensures true unit isolation and prevents bugs in other pages from breaking this test.
const Stub = { template: '<div></div>' };

const routes = [
  { path: '/', component: Stub, name: 'Main' },
  { path: '/create', component: Create, name: 'Create' },
  { path: '/activation-sent', component: Stub },
  { path: '/account-created', component: Stub },
  { path: '/account-not-active', component: Stub },
  { path: '/activation-expired', component: Stub },
  { path: '/request-activation-link', component: Stub },
  { path: '/activation-resent', component: Stub },
  { path: '/forgot-password', component: Stub },
  { path: '/reset-password', component: Stub },
  { path: '/password-reset-sent', component: Stub },
  { path: '/password-reset-success', component: Stub },
  { path: '/reset-expired', component: Stub },
  { path: '/account-deleted', component: Stub },
  { path: '*', redirect: '/' },
];

//Setup Mocks
const mockRegisterAction = jest.fn().mockResolvedValue({});

const makeStore = ({ offline = false } = {}) =>
  new Vuex.Store({
    state: {
      connection: {
        online: !offline,
      },
    },
    modules: {
      policies: {
        namespaced: true,
        getters: {
          getPolicyAcceptedData: () => () => ({}),
        },
      },
    },
    actions: {
      register: mockRegisterAction,
    },
  });

const renderComponent = async ({ routeQuery = {}, offline = false } = {}) => {
  // Fresh router instance for every test
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
  test('renders the create account page', async () => {
    await renderComponent();

    expect(await screen.findByRole('heading', { name: /create an account/i })).toBeInTheDocument();
  });

  test('shows validation state when submitting empty form', async () => {
    await renderComponent();

    const finishButton = screen.getByRole('button', { name: /finish/i });
    await userEvent.click(finishButton);

    expect(mockRegisterAction).not.toHaveBeenCalled();
  });

  test('allows user to fill in text input fields', async () => {
    await renderComponent();

    await userEvent.type(screen.getByLabelText(/first name/i), 'Test');
    await userEvent.type(screen.getByLabelText(/last name/i), 'User');
    await userEvent.type(screen.getByLabelText(/email/i), 'test@test.com');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'tester123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'tester123');

    expect(screen.getByLabelText(/first name/i)).toHaveValue('Test');
    expect(screen.getByLabelText(/last name/i)).toHaveValue('User');
    expect(screen.getByLabelText(/email/i)).toHaveValue('test@test.com');
    expect(screen.getByLabelText(/^password$/i)).toHaveValue('tester123');
    expect(screen.getByLabelText(/confirm password/i)).toHaveValue('tester123');
  });

  test('allows user to check checkboxes', async () => {
    await renderComponent();

    const contentSourcesCheckbox = screen.getByLabelText(/tagging content sources/i);
    const tosCheckbox = screen.getByLabelText(/i have read and agree to terms of service/i);

    await userEvent.click(contentSourcesCheckbox);
    await userEvent.click(tosCheckbox);

    expect(contentSourcesCheckbox).toBeChecked();
    expect(tosCheckbox).toBeChecked();
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
  describe('backend failures', () => {
    test.skip('shows specific error when email already exists (403)', async () => {
      mockRegisterAction.mockRejectedValue({ response: { status: 403 } });
      await renderComponent();
      // fill form...
      // click submit...
      // expect(await screen.findByText(/account with this email already exists/i))
      // .toBeInTheDocument();
    });

    test.skip('redirects if account not activated (405)', async () => {
      mockRegisterAction.mockRejectedValue({ response: { status: 405 } });
      await renderComponent();
      // fill form...
      // click submit...
      // expect(router.currentRoute.name).toBe('AccountNotActivated');
    });

    test.skip('shows generic error for other server errors', async () => {
      mockRegisterAction.mockRejectedValue({ response: { status: 500 } });
      await renderComponent();
      // fill form...
      // click submit...
      // expect(await screen.findByText(/problem creating account/i)).toBeInTheDocument();
    });
  });
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
  // NOTE:
  // Offline submission depends on the same required Vuetify select fields
  // as the successful submission flow.
  // Since those fields cannot be reliably exercised via userEvent,
  // this scenario cannot currently reach the submission state.
  // This test will be re-enabled once Vuetify is removed .
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
