import { mount } from '@vue/test-utils';
import UserStorage from '../UserStorage';
import { ONE_TB } from 'shared/constants';

const userId = 'test-user-id';
const diskSpace = 1;

function makeWrapper(props = {}) {
  return mount(UserStorage, {
    sync: false,
    propsData: {
      userId,
      value: diskSpace,
      ...props,
    },
  });
}

describe('userStorage', () => {
  let wrapper;
  const updateUser = jest.fn().mockReturnValue(Promise.resolve());
  beforeEach(() => {
    wrapper = makeWrapper();
    wrapper.setProps({ value: true }); // Allow watch event to trigger
    wrapper.setMethods({ updateUser });
    updateUser.mockClear();
  });
  it('clicking cancel should reset the values', () => {
    wrapper = makeWrapper({ showCancel: true });
    wrapper.setData({ space: diskSpace + 100 });
    wrapper.find('[data-test="cancel"]').trigger('click');
    expect(wrapper.vm.space).toBe(diskSpace);
  });
  it('submitting form should call submit', () => {
    const submit = jest.fn();
    wrapper.setMethods({ submit });
    wrapper.find({ ref: 'form' }).trigger('submit');
    expect(submit).toHaveBeenCalled();
  });
  it('submit should not call updateUser if space is blank', () => {
    wrapper.setData({ space: '' });
    wrapper.vm.submit().then(() => {
      expect(updateUser).not.toHaveBeenCalled();
    });
  });
  it('submit should not call updateUser if unit is blank', () => {
    wrapper.setData({ unit: '' });
    wrapper.vm.submit().then(() => {
      expect(updateUser).not.toHaveBeenCalled();
    });
  });
  it('submit should not call updateUser if space is negative', () => {
    wrapper.setData({ space: -100 });
    wrapper.vm.submit().then(() => {
      expect(updateUser).not.toHaveBeenCalled();
    });
  });
  it('submit should call updateUser if form is valid', () => {
    wrapper.setData({ space: 100, unit: 'ONE_TB' });
    wrapper.vm.submit().then(() => {
      expect(updateUser).toHaveBeenCalledWith({ id: userId, disk_space: 100 * ONE_TB });
    });
  });
});
