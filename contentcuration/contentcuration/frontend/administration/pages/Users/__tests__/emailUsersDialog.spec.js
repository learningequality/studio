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
  return mount(EmailUsersDialog, {
    store,
    propsData: {
      query: {
        ids: [userId, userId2],
      },
    },
    computed: {
      users() {
        return [user1, user2];
      },
    },
  });
}

describe('emailUsersDialog', () => {
  let wrapper;

  beforeEach(async () => {
    wrapper = makeWrapper();
    await wrapper.setProps({ value: true }); // Allow watch event to trigger
  });

  it('selected should get set to userIds on dialog open', () => {
    expect(wrapper.vm.selected).toEqual([userId, userId2]);
  });

  describe('on close', () => {
    it('should emit input event with false value', () => {
      wrapper.vm.show = false;
      expect(wrapper.emitted('input')[0][0]).toBe(false);
    });

    it('should show warning if subject is not blank', async () => {
      await wrapper.setData({ subject: 'subject' });
      await wrapper.findComponent('[data-test="cancel"]').trigger('click');
      expect(wrapper.vm.showWarning).toBe(true);
    });

    it('should show warning if message is not blank', async () => {
      await wrapper.setData({ message: 'message' });
      await wrapper.findComponent('[data-test="cancel"]').trigger('click');
      expect(wrapper.vm.showWarning).toBe(true);
    });

    it('confirming close should reset fields and close dialog', async () => {
      await wrapper.setData({ subject: 'subject', message: 'message' });
      wrapper.findComponent('[data-test="confirm"]').vm.$emit('confirm');
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
      await wrapper.findComponent('[data-test="send"]').trigger('click');
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('should not send if message is empty', async () => {
      await wrapper.setData({ subject: 'subject' });
      await wrapper.findComponent('[data-test="send"]').trigger('click');
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('should call sendEmail if form is valid', async () => {
      const emailData = { subject: 'subject', message: 'message' };
      await wrapper.setData(emailData);
      await wrapper.findComponent('[data-test="send"]').trigger('click');
      expect(sendEmail).toHaveBeenCalledWith({
        ...emailData,
        query: {
          ids: `${userId},${userId2}`,
        },
      });
    });
  });

  it('clicking placeholder should add it to the message', async () => {
    const message = 'Testing';
    await wrapper.setData({ message });
    wrapper.vm.addPlaceholder('{test}');
    expect(wrapper.vm.message).toBe(`${message} {test}`);
  });

  it('clicking remove on user should remove user from recipients', () => {
    wrapper.findComponent('[data-test="remove"]').vm.$emit('input', userId);
    expect(wrapper.vm.selected).toEqual([userId2]);
  });
});
