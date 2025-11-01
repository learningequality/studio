import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import EmailUsersDialog from '../EmailUsersDialog';

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);

const userId = 'test-user-id';
const userId2 = 'test-user-id2';
const user1 = {
  id: userId,
  name: 'Testy User',
  email: 'test@user.com',
};
const user2 = {
  id: userId2,
  name: 'Testier User',
  email: 'test2@user.com',
};

const mockActions = {
  sendEmail: jest.fn(() => Promise.resolve()),
  showSnackbarSimple: jest.fn(() => Promise.resolve()),
};

const createMockStore = () => {
  return new Vuex.Store({
    modules: {
      userAdmin: {
        namespaced: true,
        getters: {
          getUsers: () => ids => {
            const usersMap = {
              [userId]: user1,
              [userId2]: user2,
            };
            return ids.map(id => usersMap[id]);
          },
        },
        actions: {
          sendEmail: mockActions.sendEmail,
        },
      },
    },
    actions: {
      showSnackbarSimple: mockActions.showSnackbarSimple,
    },
  });
};

const renderComponent = (props = {}) => {
  const defaultProps = {
    value: true,
    ...props,
  };

  const store = createMockStore();

  return render(EmailUsersDialog, {
    localVue,
    store,
    props: defaultProps,
    routes: new VueRouter(),
  });
};

describe('EmailUsersDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.senderEmail = 'sender@example.com';
  });

  it('shows email dialog with correct title', () => {
    renderComponent();
    expect(screen.getByText('Send Email')).toBeInTheDocument();
  });

  it('displays sender email in From field', () => {
    renderComponent();
    expect(screen.getByText('sender@example.com')).toBeInTheDocument();
  });

  it('displays individual user chips when initialRecipients are provided', () => {
    renderComponent({ initialRecipients: [userId, userId2] });
    expect(screen.getByText('Testy User')).toBeInTheDocument();
    expect(screen.getByText('Testier User')).toBeInTheDocument();
  });

  it('displays filter description when usersFilterFetchQueryParams are provided', () => {
    renderComponent({
      userTypeFilter: 'active',
      locationFilter: 'Czech Republic',
      keywordFilter: 'test',
      usersFilterFetchQueryParams: {
        is_active: true,
        location: 'Czech Republic',
        keywords: 'test',
      },
    });
    expect(
      screen.getByText('All active users from Czech Republic matching "test"'),
    ).toBeInTheDocument();
  });

  it('displays all placeholder buttons', () => {
    renderComponent();
    expect(screen.getByText('First name')).toBeInTheDocument();
    expect(screen.getByText('Last name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Time')).toBeInTheDocument();
  });

  describe('form validation', () => {
    it('shows validation errors when submitting empty form', async () => {
      const user = userEvent.setup();
      renderComponent({ initialRecipients: [userId] });

      await user.click(screen.getByText('Send email'));

      const errorMessages = screen.getAllByText('Field is required');
      expect(errorMessages.length).toBeGreaterThan(0);
      expect(mockActions.sendEmail).not.toHaveBeenCalled();
    });

    it('does not submit when subject is empty', async () => {
      const user = userEvent.setup();
      renderComponent({ initialRecipients: [userId] });

      const messageInput = screen.getByLabelText(/email body/i);
      await user.type(messageInput, 'Test Message');
      await user.click(screen.getByText('Send email'));

      expect(mockActions.sendEmail).not.toHaveBeenCalled();
    });

    it('does not submit when message is empty', async () => {
      const user = userEvent.setup();
      renderComponent({ initialRecipients: [userId] });

      const subjectInput = screen.getByLabelText(/subject line/i);
      await user.type(subjectInput, 'Test Subject');
      await user.click(screen.getByText('Send email'));

      expect(mockActions.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('placeholder functionality', () => {
    it('adds placeholder to message when placeholder button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent({ initialRecipients: [userId] });

      const messageInput = screen.getByLabelText(/email body/i);
      await user.type(messageInput, 'Hello ');
      await user.click(screen.getByText('First name'));

      expect(messageInput.value).toContain('Hello');
    });
  });

  describe('with individual users', () => {
    it('calls sendEmail with correct arguments when form is submitted', async () => {
      const user = userEvent.setup();
      renderComponent({ initialRecipients: [userId, userId2] });

      expect(screen.getByText('Testy User')).toBeInTheDocument();
      expect(screen.getByText('Testier User')).toBeInTheDocument();

      await user.type(screen.getByLabelText(/subject line/i), 'Test Subject');
      await user.type(screen.getByLabelText(/email body/i), 'Test Message');
      await user.click(screen.getByText('Send email'));

      expect(mockActions.sendEmail).toHaveBeenCalledWith(expect.any(Object), {
        subject: 'Test Subject',
        message: 'Test Message',
        query: {
          ids: `${userId},${userId2}`,
        },
      });
    });

    it('removes user from recipients when remove button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent({ initialRecipients: [userId, userId2] });

      expect(screen.getByText('Testy User')).toBeInTheDocument();
      expect(screen.getByText('Testier User')).toBeInTheDocument();

      const removeButton = screen.getByRole('button', { name: 'Remove Testy User' });
      await user.click(removeButton);

      expect(screen.queryByText('Testy User')).not.toBeInTheDocument();
      expect(screen.getByText('Testier User')).toBeInTheDocument();
    });
  });

  describe('with user filters', () => {
    it('calls sendEmail with filter parameters when form is submitted', async () => {
      const user = userEvent.setup();
      renderComponent({
        usersFilterFetchQueryParams: {
          is_active: true,
          location: 'Czech Republic',
          keywords: 'test',
        },
      });

      await user.type(screen.getByLabelText(/subject line/i), 'Bulk Email Subject');
      await user.type(screen.getByLabelText(/email body/i), 'Bulk Email Message');
      await user.click(screen.getByText('Send email'));

      expect(mockActions.sendEmail).toHaveBeenCalledWith(expect.any(Object), {
        subject: 'Bulk Email Subject',
        message: 'Bulk Email Message',
        query: {
          is_active: true,
          location: 'Czech Republic',
          keywords: 'test',
        },
      });
    });
  });

  describe('warning modal', () => {
    it('shows warning modal when canceling with draft content', async () => {
      const user = userEvent.setup();
      renderComponent({ initialRecipients: [userId] });

      await user.type(screen.getByLabelText(/subject line/i), 'Draft Subject');
      await user.click(screen.getByText('Cancel'));

      expect(screen.getByText('Draft in progress')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Draft will be lost upon exiting this editor. Are you sure you want to continue?',
        ),
      ).toBeInTheDocument();
    });

    it('does not show warning modal when canceling without draft content', async () => {
      const user = userEvent.setup();
      renderComponent({ initialRecipients: [userId] });

      await user.click(screen.getByText('Cancel'));

      expect(screen.queryByText('Draft in progress')).not.toBeInTheDocument();
    });

    it('closes dialog when confirming discard in warning modal', async () => {
      const user = userEvent.setup();
      const { emitted } = renderComponent({ initialRecipients: [userId] });

      await user.type(screen.getByLabelText(/subject line/i), 'Draft Subject');
      await user.click(screen.getByText('Cancel'));

      const discardButton = screen.getByRole('button', { name: /discard draft/i });
      await user.click(discardButton);

      expect(emitted().input).toBeTruthy();
      expect(emitted().input[0]).toEqual([false]);
    });

    it('keeps dialog open when canceling warning modal', async () => {
      const user = userEvent.setup();
      renderComponent({ initialRecipients: [userId] });

      await user.type(screen.getByLabelText(/subject line/i), 'Draft Subject');
      await user.click(screen.getByText('Cancel'));

      const keepOpenButton = screen.getByRole('button', { name: /keep open/i });
      await user.click(keepOpenButton);

      expect(screen.getByText('Send Email')).toBeInTheDocument();
      expect(screen.queryByText('Draft in progress')).not.toBeInTheDocument();
    });
  });

  describe('success and error handling', () => {
    it('shows success snackbar when email is sent successfully', async () => {
      const user = userEvent.setup();
      renderComponent({ initialRecipients: [userId] });

      await user.type(screen.getByLabelText(/subject line/i), 'Test Subject');
      await user.type(screen.getByLabelText(/email body/i), 'Test Message');
      await user.click(screen.getByText('Send email'));

      expect(mockActions.showSnackbarSimple).toHaveBeenCalledWith(expect.any(Object), 'Email sent');
    });

    it('shows error snackbar when email fails to send', async () => {
      mockActions.sendEmail.mockRejectedValueOnce(new Error('Send failed'));
      const user = userEvent.setup();
      renderComponent({ initialRecipients: [userId] });

      await user.type(screen.getByLabelText(/subject line/i), 'Test Subject');
      await user.type(screen.getByLabelText(/email body/i), 'Test Message');
      await user.click(screen.getByText('Send email'));

      expect(mockActions.showSnackbarSimple).toHaveBeenCalledWith(
        expect.any(Object),
        'Email failed to send',
      );
    });
  });
});
