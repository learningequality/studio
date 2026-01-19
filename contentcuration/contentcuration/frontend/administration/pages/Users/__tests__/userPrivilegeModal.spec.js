import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createLocalVue } from '@vue/test-utils';
import Vuex, { Store } from 'vuex';
import VueRouter from 'vue-router';
import UserPrivilegeModal from '../UserPrivilegeModal';

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);

const currentEmail = 'myadminaccount@email.com';

const createMockStore = () => {
  return new Store({
    state: {
      session: {
        currentUser: {
          email: currentEmail,
        },
      },
    },
  });
};

const renderComponent = (props = {}) => {
  const confirmAction = jest.fn(() => Promise.resolve());
  const store = createMockStore();

  const defaultProps = {
    value: true,
    title: 'Add admin privileges',
    text: 'Are you sure you want to add admin privileges to user ...?',
    confirmText: 'Add privileges',
    confirmAction,
    ...props,
  };

  return {
    ...render(UserPrivilegeModal, {
      localVue,
      store,
      routes: new VueRouter(),
      props: defaultProps,
    }),
    confirmAction,
  };
};

describe('userPrivilegeModal', () => {
  it('should render modal with correct title, text, and confirm button label', () => {
    renderComponent();

    expect(screen.getByText('Add admin privileges')).toBeInTheDocument();
    expect(
      screen.getByText('Are you sure you want to add admin privileges to user ...?'),
    ).toBeInTheDocument();
    expect(screen.getByText('Add privileges')).toBeInTheDocument();
  });

  describe('clicking cancel', () => {
    let user;
    let confirmAction;
    let emitted;

    beforeEach(async () => {
      user = userEvent.setup();
      const result = renderComponent();
      confirmAction = result.confirmAction;
      emitted = result.emitted;

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
    });

    it('should not call confirmAction', () => {
      expect(confirmAction).not.toHaveBeenCalled();
    });

    it('should emit input event with false', () => {
      expect(emitted().input[0]).toEqual([false]);
    });
  });

  describe('submitting the form with empty e-mail', () => {
    let user;
    let confirmAction;
    let emitted;

    beforeEach(async () => {
      user = userEvent.setup();
      const result = renderComponent();
      confirmAction = result.confirmAction;
      emitted = result.emitted;

      const submitButton = screen.getByRole('button', { name: /add privileges/i });
      await user.click(submitButton);
    });

    it('should show validation error', () => {
      expect(screen.getByText('Email must match your account email')).toBeInTheDocument();
    });

    it('should not call confirmAction', () => {
      expect(confirmAction).not.toHaveBeenCalled();
    });

    it('should not emit input event', () => {
      expect(emitted().input).toBeUndefined();
    });
  });

  describe('submitting the form with an e-mail different from the current e-mail', () => {
    let user;
    let confirmAction;
    let emitted;

    beforeEach(async () => {
      user = userEvent.setup();
      const result = renderComponent();
      confirmAction = result.confirmAction;
      emitted = result.emitted;

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'differentemail@email.com');

      const submitButton = screen.getByRole('button', { name: /add privileges/i });
      await user.click(submitButton);
    });

    it('should show validation error', () => {
      expect(screen.getByText('Email must match your account email')).toBeInTheDocument();
    });

    it('should not call confirmAction', () => {
      expect(confirmAction).not.toHaveBeenCalled();
    });

    it('should not emit input event', () => {
      expect(emitted().input).toBeUndefined();
    });
  });

  describe('submitting the form with the current e-mail', () => {
    let user;
    let confirmAction;
    let emitted;

    beforeEach(async () => {
      user = userEvent.setup();
      const result = renderComponent();
      confirmAction = result.confirmAction;
      emitted = result.emitted;

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, currentEmail);

      const submitButton = screen.getByRole('button', { name: /add privileges/i });
      await user.click(submitButton);
    });

    it('should not show validation error', () => {
      expect(screen.queryByText('Email must match your account email')).not.toBeInTheDocument();
    });

    it('should call confirmAction', () => {
      expect(confirmAction).toHaveBeenCalled();
    });

    it('should emit input event with false', () => {
      expect(emitted().input[0]).toEqual([false]);
    });
  });
});
