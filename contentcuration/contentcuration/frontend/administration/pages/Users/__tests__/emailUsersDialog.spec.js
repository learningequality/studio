import { mount } from '@vue/test-utils';
import EmailUsersDialog from '../EmailUsersDialog';
import { factory } from '../../../store';

const store = factory();

const userId = 'test-user-id';
const userEmail = 'test@user.com';
const userId2 = 'test-user-id2';
const userEmail2 = 'test2@user.com';
const user1 = {
  id: userId,
  name: 'Testy User',
  email: userEmail,
};
const user2 = {
  id: userId2,
  name: 'Testier User',
  email: userEmail2,
};

function makeWrapper() {
  const wrapper = mount(EmailUsersDialog, {
    store,
    propsData: {
      initialRecipients: [userId, userId2],
    },
    computed: {
      users() {
        return [user1, user2];
      },
    },
  });

  wrapper.vm.$refs = {
    message: {
      focus: jest.fn(),
    },
  };

  return wrapper;
}

function makeBulkWrapper() {
  const wrapper = mount(EmailUsersDialog, {
    store,
    propsData: {
      userTypeFilter: 'active',
      locationFilter: 'Czech Republic',
      keywordFilter: 'test',
      usersFilterFetchQueryParams: {
        is_active: true,
        location: 'Czech Republic',
        keywords: 'test',
      },
    },
  });

  wrapper.vm.$refs = {
    message: {
      focus: jest.fn(),
    },
  };

  return wrapper;
}

describe('emailUsersDialog', () => {
  let wrapper;

  beforeEach(async () => {
    wrapper = makeWrapper();
    await wrapper.setProps({ value: true });
  });

  it('recipients should get set to userIds on dialog open', () => {
    expect(wrapper.vm.recipients).toEqual([userId, userId2]);
  });

  describe('on close', () => {
    it('should emit input event with false value', () => {
      wrapper.vm.show = false;
      expect(wrapper.emitted('input')[0][0]).toBe(false);
    });

    it('should show warning if subject is not blank', async () => {
      await wrapper.setData({ subject: 'subject' });
      await wrapper.vm.cancel();
      expect(wrapper.vm.showWarning).toBe(true);
    });

    it('should show warning if message is not blank', async () => {
      await wrapper.setData({ message: 'message' });
      await wrapper.vm.cancel();
      expect(wrapper.vm.showWarning).toBe(true);
    });

    it('should not show warning when canceling with no draft content', async () => {
      await wrapper.setData({ subject: '', message: '' });
      await wrapper.vm.cancel();
      expect(wrapper.vm.showWarning).toBe(false);
    });

    it('confirming close should reset fields and close dialog', async () => {
      await wrapper.setData({ subject: 'subject', message: 'message' });
      wrapper.vm.showWarning = true;
      await wrapper.vm.$nextTick();
      await wrapper.findComponent('[data-test="confirm"]').vm.$emit('submit');
      expect(wrapper.vm.subject).toBe('');
      expect(wrapper.vm.message).toBe('');
      expect(wrapper.emitted('input')[0][0]).toBe(false);
    });
  });

  describe('on submit', () => {
    let sendEmail;

    beforeEach(() => {
      sendEmail = jest.spyOn(wrapper.vm, 'sendEmail').mockReturnValue(Promise.resolve());
    });

    it('should not send if subject is empty', async () => {
      await wrapper.setData({ message: 'message' });
      await wrapper.vm.submit();
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('should not send if message is empty', async () => {
      await wrapper.setData({ subject: 'subject' });
      await wrapper.vm.submit();
      expect(sendEmail).not.toHaveBeenCalled();
    });
  });

  it('clicking placeholder should add it to the message', async () => {
    const message = 'Testing';
    await wrapper.setData({ message });
    const focusMock = jest.fn();
    wrapper.vm.$refs.message.focus = focusMock;

    wrapper.vm.addPlaceholder('{test}');
    expect(wrapper.vm.message).toBe(`${message} {test}`);
    expect(focusMock).toHaveBeenCalled();
  });

  describe('when used with individual users', () => {
    it('submitting should call sendEmail with correct arguments if form is valid', async () => {
      const sendEmail = jest.spyOn(wrapper.vm, 'sendEmail').mockReturnValue(Promise.resolve());

      const emailData = { subject: 'subject', message: 'message' };
      await wrapper.setData(emailData);
      await wrapper.vm.onSubmit();
      expect(sendEmail).toHaveBeenCalledWith({
        ...emailData,
        query: {
          ids: `${userId},${userId2}`,
        },
      });
    });

    it('user chips should be shown in the "To" line', () => {
      const chips = wrapper.find('[data-test="to-line"]').findAllComponents({ name: 'StudioChip' });
      expect(chips).toHaveLength(2);
    });

    it('clicking remove on user should remove user from recipients', () => {
      wrapper.vm.remove(userId);
      expect(wrapper.vm.recipients).toEqual([userId2]);
    });

    it('should show remove buttons for multiple recipients', () => {
      const removeChips = wrapper.findAllComponents('[data-test="remove-chip"]');
      expect(removeChips.length).toBe(2);
    });
  });

  describe('when used with user filters', () => {
    beforeEach(async () => {
      wrapper = makeBulkWrapper();
      await wrapper.setProps({ value: true });
    });

    it('submitting should call sendEmail with correct arguments if form is valid', async () => {
      const sendEmail = jest.spyOn(wrapper.vm, 'sendEmail').mockReturnValue(Promise.resolve());

      const emailData = { subject: 'subject', message: 'message' };
      await wrapper.setData(emailData);

      await wrapper.vm.onSubmit();
      expect(sendEmail).toHaveBeenCalledWith({
        ...emailData,
        query: {
          is_active: true,
          location: 'Czech Republic',
          keywords: 'test',
        },
      });
    });

    it('a descriptive string should be shown in the "To" line', () => {
      const toLineChip = wrapper
        .find('[data-test="to-line"]')
        .findComponent({ name: 'StudioChip' });
      expect(toLineChip.text()).toContain('All active users');
    });
  });

  describe('additional important tests', () => {
    it('should show warning modal when present', async () => {
      wrapper.vm.showWarning = true;
      await wrapper.vm.$nextTick();
      const warningModal = wrapper.findComponent('[data-test="confirm"]');
      expect(warningModal.exists()).toBe(true);
    });

    it('should show validation errors after failed submission', async () => {
      await wrapper.setData({ subject: '', message: '' });
      await wrapper.vm.onValidationFailed();
      expect(wrapper.vm.showInvalidText).toBe(true);
    });

    it('should show StudioBanner when there are validation errors', async () => {
      await wrapper.setData({
        subject: '',
        message: '',
        showInvalidText: true,
      });
      wrapper.vm.errors = { subject: true, message: true };
      await wrapper.vm.$nextTick();

      const banner = wrapper.findComponent({ name: 'StudioBanner' });
      expect(banner.exists()).toBe(true);
    });

    it('should close warning modal when cancel is clicked', async () => {
      wrapper.vm.showWarning = true;
      await wrapper.vm.$nextTick();

      const warningModal = wrapper.findComponent('[data-test="confirm"]');
      warningModal.vm.$emit('cancel');

      expect(wrapper.vm.showWarning).toBe(false);
    });
  });
});
