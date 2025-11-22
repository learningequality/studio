import Vue from 'vue';
import Vuex, { Store } from 'vuex';
import VueRouter from 'vue-router';
import { render, screen, waitFor } from '@testing-library/vue';
import { configure } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import AccountsMain from '../AccountsMain.vue';

Vue.use(Vuex);
Vue.use(VueRouter);

configure({ testIdAttribute: 'data-test' });

// ---- Mocks and helpers ---------------------------------------------------
const loginMock = jest.fn();

const makeRouter = (query = {}) => {
  const router = new VueRouter({
    mode: 'abstract',
    routes: [
      { path: '/signin', name: 'SignIn', component: AccountsMain },
      { path: '/forgot', name: 'ForgotPassword', component: { render: h => h('div') } },
      { path: '/create', name: 'Create', component: { render: h => h('div') } },
      {
        path: '/account-not-activated',
        name: 'AccountNotActivated',
        component: { render: h => h('div') },
      },
    ],
  });
  router.replace({ path: '/signin', query });
  return router;
};

const makeStore = (overrides = {}) =>
  new Store({
    state: { connection: { online: true }, ...(overrides.state || {}) },
    actions: {
      login: loginMock,
      ...(overrides.actions || {}),
    },
    getters: { ...(overrides.getters || {}) },
  });

const renderComponent = ({ query, store } = {}) => {
  const router = makeRouter(query);
  const vuex = makeStore(store);

  delete window.location;
  const nextSearch = query?.next ? `?next=${query.next}` : '';
  Object.defineProperty(window, 'location', {
    value: {
      href: `http://test.local/signin${nextSearch}`,
      search: nextSearch,
      assign: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
    },
    writable: true,
  });

  const utils = render(AccountsMain, {
    routes: router,
    store: vuex,
    stubs: ['GlobalSnackbar', 'PolicyModals'],
  });
  return { router, ...utils };
};

// ---- Window location stub (for next= redirect) ---------------------------
const origLocation = window.location;
beforeEach(() => {
  jest.clearAllMocks();
  loginMock.mockReset();
});
afterAll(() => {
  window.location = origLocation;
});

// ---- Tests ---------------------------------------------------------------
describe('AccountsMain', () => {
  it('renders sign-in form', () => {
    renderComponent({});
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('submitting empty form blocks login and shows validation', async () => {
    loginMock.mockResolvedValue();
    renderComponent({});
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(loginMock).not.toHaveBeenCalled();
    const msgs = await screen.findAllByText(/this field is required/i);
    expect(msgs.length).toBeGreaterThanOrEqual(1);
  });

  it('valid credentials call login', async () => {
    loginMock.mockResolvedValue();
    renderComponent({});
    await userEvent.type(screen.getByLabelText(/email/i), 'test@test.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(loginMock).toHaveBeenCalled());
  });

  it('with ?next= shows banner and redirects after successful login', async () => {
    loginMock.mockResolvedValue();
    const nextUrl = '/test-next/';
    const { router } = renderComponent({ query: { next: nextUrl } });

    expect(screen.getByTestId('loginToProceed')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/email/i), 'test@test.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith(nextUrl);
    });
    expect(router.currentRoute.name).toBe('SignIn');
  });

  it('generic failure does not navigate', async () => {
    loginMock.mockRejectedValue({ response: { status: 500 } });
    const { router } = renderComponent({});
    await userEvent.type(screen.getByLabelText(/email/i), 'test@test.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(loginMock).toHaveBeenCalled());
    expect(router.currentRoute.name).toBe('SignIn');
  });

  it('405 failure navigates to AccountNotActivated', async () => {
    const store = {
      actions: { login: jest.fn().mockRejectedValue({ response: { status: 405 } }) },
    };
    const { router } = renderComponent({ store });
    await userEvent.type(screen.getByLabelText(/email/i), 'test@test.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(router.currentRoute.name).toBe('AccountNotActivated'));
  });

  it('calls login with exact payload', async () => {
    loginMock.mockResolvedValue();
    const nextUrl = '/test-next/';
    renderComponent({ query: { next: nextUrl } });

    await userEvent.type(screen.getByLabelText(/email/i), 'test@test.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(loginMock).toHaveBeenCalled());

    const [, payload] = loginMock.mock.calls[0];

    expect(payload).toMatchObject({ password: 'password123' });

    const idMatches =
      (payload.email && payload.email === 'test@test.com') ||
      (payload.username && payload.username === 'test@test.com');
    expect(idMatches).toBe(true);

    expect(payload.next).toBe(undefined);
  });
});
