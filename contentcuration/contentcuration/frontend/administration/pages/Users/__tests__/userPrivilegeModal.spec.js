import { mount } from '@vue/test-utils';
import UserPrivilegeModal from '../UserPrivilegeModal';

const userId = 'test-user-id';
const currentEmail = 'mytest@email.com';

function makeWrapper(props = {}) {
  return mount(UserPrivilegeModal, {
    propsData: {
      userId,
      value: true,
      ...props,
    },
    computed: {
      user() {
        return {
          id: userId,
        };
      },
      currentEmail() {
        return currentEmail;
      },
    },
  });
}

describe('userPrivilegeModal', () => {
  let wrapper;
  let confirmAction;

  beforeEach(() => {
    confirmAction = jest.fn();
    wrapper = makeWrapper({ confirmAction });
  });

  it('clicking cancel should reset the values', async () => {
    wrapper = makeWrapper({ emailConfirm: 'testing' });
    wrapper.findComponent('[data-test="cancel"]').trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.emailConfirm).toBe('');
  });

  it('submitting form should call confirm', async () => {
    const confirm = jest.spyOn(wrapper.vm, 'confirm');
    confirm.mockImplementation(() => {});
    wrapper.findComponent({ ref: 'form' }).trigger('submit');
    await wrapper.vm.$nextTick();
    expect(confirm).toHaveBeenCalled();
  });

  it('confirm should not call confirmAction if emailConfirm is blank', async () => {
    wrapper.vm.confirm();
    await wrapper.vm.$nextTick();
    expect(confirmAction).not.toHaveBeenCalled();
  });

  it('confirm should not call confirmAction if emailConfirm is not correct', async () => {
    await wrapper.setData({ emailConfirm: 'notmytest@email.com' });
    wrapper.vm.confirm();
    await wrapper.vm.$nextTick();
    expect(confirmAction).not.toHaveBeenCalled();
  });

  it('confirm should call confirmAction if form is valid', async () => {
    await wrapper.setData({ emailConfirm: currentEmail });
    wrapper.vm.confirm();
    await wrapper.vm.$nextTick();
    expect(confirmAction).toHaveBeenCalled();
  });
});
