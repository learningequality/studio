import { mount } from '@vue/test-utils';
import UserPrivilegeModal from '../UserPrivilegeModal';

const userId = 'test-user-id';
const updateUser = jest.fn().mockReturnValue(Promise.resolve());
const currentEmail = 'mytest@email.com';

function makeWrapper(props = {}) {
  return mount(UserPrivilegeModal, {
    propsData: {
      userId,
      value: true,
      confirmAction: jest.fn(),
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
    methods: { updateUser },
  });
}

describe('userPrivilegeModal', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = makeWrapper();
    updateUser.mockClear();
  });
  it('clicking cancel should reset the values', () => {
    wrapper = makeWrapper({ emailConfirm: 'testing' });
    wrapper.find('[data-test="cancel"]').trigger('click');
    expect(wrapper.vm.emailConfirm).toBe('');
  });
  it('submitting form should call confirm', () => {
    const confirm = jest.fn();
    wrapper.setMethods({ confirm });
    wrapper.find({ ref: 'form' }).trigger('submit');
    expect(confirm).toHaveBeenCalled();
  });
  it('confirm should not call confirmAction if emailConfirm is blank', () => {
    const confirmAction = jest.fn();
    wrapper.setProps({ confirmAction });
    wrapper.vm.confirm();
    expect(confirmAction).not.toHaveBeenCalled();
  });
  it('confirm should not call confirmAction if emailConfirm is not correct', () => {
    const confirmAction = jest.fn();
    wrapper.setProps({ confirmAction });
    wrapper.setData({ emailConfirm: 'notmytest@email.com' });
    wrapper.vm.confirm();
    expect(confirmAction).not.toHaveBeenCalled();
  });
  it('confirm should call confirmAction if form is valid', () => {
    const confirmAction = jest.fn();
    wrapper.setProps({ confirmAction });
    wrapper.setData({ emailConfirm: currentEmail });
    wrapper.vm.confirm();
    expect(confirmAction).toHaveBeenCalled();
  });
});
