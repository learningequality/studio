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

  it('renders email dialog with correct title and sender', () => {
    renderComponent();
    expect(screen.getByRole('heading', { name: 'Send email' })).toBeInTheDocument();
    expect(screen.getByText('sender@example.com')).toBeInTheDocument();
  });

  it('shows user chips when initialRecipients are provided', () => {
    renderComponent({ initialRecipients: [userId, userId2] });
    expect(screen.getByText('Testy User')).toBeInTheDocument();
    expect(screen.getByText('Testier User')).toBeInTheDocument();
  });

  it('shows filter description when usersFilterFetchQueryParams exist', () => {
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

  it('shows placeholder buttons', () => {
    renderComponent();
    ['First name', 'Last name', 'Email', 'Date', 'Time'].forEach(text =>
      expect(screen.getByRole('button', { name: text })).toBeInTheDocument(),
    );
  });

  describe('form validation', () => {
    it('shows validation errors when submitting empty form', async () => {
      const user = userEvent.setup();
      renderComponent({ initialRecipients: [userId] });

      await user.click(screen.getByRole('button', { name: 'Send email' }));

      expect(screen.getAllByText('Field is required').length).toBeGreaterThan(0);
      expect(mockActions.sendEmail).not.toHaveBeenCalled();
    });

    it('does not submit with missing subject or message', async () => {
      const user = userEvent.setup();
      renderComponent({ initialRecipients: [userId] });

      const messageInput = screen.getByLabelText(/email body/i);
      const subjectInput = screen.getByLabelText(/subject line/i);

      await user.type(messageInput, 'Test Message');
      await user.click(screen.getByRole('button', { name: 'Send email' }));
      expect(mockActions.sendEmail).not.toHaveBeenCalled();

      await user.clear(messageInput);
      await user.type(subjectInput, 'Test Subject');
      await user.click(screen.getByRole('button', { name: 'Send email' }));
      expect(mockActions.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('placeholders', () => {
    it('adds placeholder text to message when clicked', async () => {
      const user = userEvent.setup();
      renderComponent({ initialRecipients: [userId] });

      const messageInput = screen.getByLabelText(/email body/i);
      await user.type(messageInput, 'Hello');
      await user.click(screen.getByRole('button', { name: 'First name' }));

      expect(messageInput.value).toBe('Hello {first_name}');
    });
  });

  describe('recipients handling', () => {
    it('submits with correct arguments for individual users', async () => {
      const user = userEvent.setup();
      renderComponent({ initialRecipients: [userId, userId2] });

      await user.type(screen.getByLabelText(/subject line/i), 'Test Subject');
      await user.type(screen.getByLabelText(/email body/i), 'Test Message');
      await user.click(screen.getByRole('button', { name: 'Send email' }));

      expect(mockActions.sendEmail).toHaveBeenCalledWith(expect.any(Object), {
        subject: 'Test Subject',
        message: 'Test Message',
        query: { ids: `${userId},${userId2}` },
      });
    });

    it('removes a recipient when the remove button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent({ initialRecipients: [userId, userId2] });

      const removeButton = screen.getByRole('button', { name: 'Remove Testy User' });
      await user.click(removeButton);

      expect(screen.queryByText('Testy User')).not.toBeInTheDocument();
      expect(screen.getByText('Testier User')).toBeInTheDocument();
    });
  });

  describe('filtered users', () => {
    it('calls sendEmail with filter parameters', async () => {
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
      await user.click(screen.getByRole('button', { name: 'Send email' }));

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

  describe('draft warning modal', () => {
    it('shows modal when canceling with draft content', async () => {
      const user = userEvent.setup();
      renderComponent({ initialRecipients: [userId] });

      await user.type(screen.getByLabelText(/subject line/i), 'Draft Subject');
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.getByText('Draft in progress')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Draft will be lost upon exiting this editor. Are you sure you want to continue?',
        ),
      ).toBeInTheDocument();
    });

    it('does not show modal when no draft content', async () => {
      const user = userEvent.setup();
      renderComponent({ initialRecipients: [userId] });

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByText('Draft in progress')).not.toBeInTheDocument();
    });

    it('closes dialog when confirming discard', async () => {
      const user = userEvent.setup();
      const { emitted } = renderComponent({ initialRecipients: [userId] });

      await user.type(screen.getByLabelText(/subject line/i), 'Draft Subject');
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      await user.click(screen.getByRole('button', { name: /discard draft/i }));

      expect(emitted().input?.[0]).toEqual([false]);
    });

    it('keeps dialog open when canceling discard', async () => {
      const user = userEvent.setup();
      renderComponent({ initialRecipients: [userId] });

      await user.type(screen.getByLabelText(/subject line/i), 'Draft Subject');
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      await user.click(screen.getByRole('button', { name: /keep open/i }));

      expect(screen.getByRole('heading', { name: 'Send email' })).toBeInTheDocument();
      expect(screen.queryByText('Draft in progress')).not.toBeInTheDocument();
    });
  });

  describe('success & error handling', () => {
    it('shows success snackbar when email sends successfully', async () => {
      const user = userEvent.setup();
      renderComponent({ initialRecipients: [userId] });

      await user.type(screen.getByLabelText(/subject line/i), 'Test Subject');
      await user.type(screen.getByLabelText(/email body/i), 'Test Message');
      await user.click(screen.getByRole('button', { name: 'Send email' }));

      expect(mockActions.showSnackbarSimple).toHaveBeenCalledWith(expect.any(Object), 'Email sent');
    });

    it('shows error snackbar when sending fails', async () => {
      mockActions.sendEmail.mockRejectedValueOnce(new Error('Send failed'));
      const user = userEvent.setup();
      renderComponent({ initialRecipients: [userId] });

      await user.type(screen.getByLabelText(/subject line/i), 'Test Subject');
      await user.type(screen.getByLabelText(/email body/i), 'Test Message');
      await user.click(screen.getByRole('button', { name: 'Send email' }));

      expect(mockActions.showSnackbarSimple).toHaveBeenCalledWith(
        expect.any(Object),
        'Email failed to send',
      );
    });
  });
});
