import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import Vuex from 'vuex';
import Vue from 'vue';
import VueRouter from 'vue-router';
import RequestNewActivationLink from '../activateAccount/RequestNewActivationLink';
import commonStrings from 'shared/translator';

Vue.use(Vuex);
Vue.use(VueRouter);

const sendActivationLinkMock = jest.fn(() => Promise.resolve());

function createTestStore({ sendActivationLink = sendActivationLinkMock } = {}) {
  return new Vuex.Store({
    modules: {
      account: {
        namespaced: true,
        actions: {
          sendActivationLink,
        },
      },
    },
  });
}

function renderComponent(storeOptions) {
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
    store: createTestStore(storeOptions),
    router,
  });
}

describe('requestNewActivationLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show a required-field error when submitting with an empty email', async () => {
    const user = userEvent.setup();
    renderComponent();

    const submitButton = screen.getByRole('button', {
      name: RequestNewActivationLink.$trs.submitButton,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(commonStrings.$tr('fieldRequired'))).toBeInTheDocument();
    });
    expect(sendActivationLinkMock).not.toHaveBeenCalled();
  });

  it('should show a validation error when submitting an invalid email', async () => {
    const user = userEvent.setup();
    renderComponent();

    const emailInput = screen.getByLabelText(RequestNewActivationLink.$trs.emailLabel);
    const submitButton = screen.getByRole('button', {
      name: RequestNewActivationLink.$trs.submitButton,
    });

    await user.type(emailInput, 'not-an-email');
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(RequestNewActivationLink.$trs.emailValidationMessage),
      ).toBeInTheDocument();
    });
    expect(sendActivationLinkMock).not.toHaveBeenCalled();
  });

  it('should submit when email is valid', async () => {
    const user = userEvent.setup();
    renderComponent();

    const emailInput = screen.getByLabelText(RequestNewActivationLink.$trs.emailLabel);
    const submitButton = screen.getByRole('button', {
      name: RequestNewActivationLink.$trs.submitButton,
    });

    await user.type(emailInput, 'test@test.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(sendActivationLinkMock).toHaveBeenCalledWith(expect.anything(), 'test@test.com');
    });
  });

  it('should show a banner when the request fails', async () => {
    const user = userEvent.setup();
    renderComponent({ sendActivationLink: jest.fn(() => Promise.reject(new Error('failed'))) });

    const emailInput = screen.getByLabelText(RequestNewActivationLink.$trs.emailLabel);
    const submitButton = screen.getByRole('button', {
      name: RequestNewActivationLink.$trs.submitButton,
    });

    await user.type(emailInput, 'test@test.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(RequestNewActivationLink.$trs.activationRequestFailed),
      ).toBeInTheDocument();
    });
  });
});
