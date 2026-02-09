import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import Vuex from 'vuex';
import Vue from 'vue';
import VueRouter from 'vue-router';
import RequestNewActivationLink from '../activateAccount/RequestNewActivationLink';

Vue.use(Vuex);
Vue.use(VueRouter);
let testStore;

function createTestStore() {
  testStore = new Vuex.Store({
    modules: {
      account: {
        namespaced: true,
        actions: {
          sendActivationLink: jest.fn(() => Promise.resolve()),
        },
      },
    },
  });
  return testStore;
}

function renderComponent() {
  const router = new VueRouter({
    routes: [
      {
        path: '/main',
        name: 'Main',
      },
      {
        path: '/activation-link-resent',
        name: 'ActivationLinkReSent',
      },
    ],
  });

  return render(RequestNewActivationLink, {
    store: createTestStore(),
    router,
  });
}

describe('requestNewActivationLink', () => {
  it('should show validation error when submitting with invalid email', async () => {
    const user = userEvent.setup();
    renderComponent();

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/activation failed/i)).toBeInTheDocument();
    });
  });

  it('should submit when email is valid', async () => {
    const user = userEvent.setup();
    renderComponent();
    const sendActivationLink = jest.spyOn(testStore, 'dispatch');

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /submit/i });

    await user.type(emailInput, 'test@test.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(sendActivationLink).toHaveBeenCalledWith(
        'account/sendActivationLink',
        'test@test.com',
      );
    });
  });
});
