import { mount } from '@vue/test-utils';
import UserStorage from '../UserStorage';
import { factory } from '../../../store';
import { ONE_TB } from 'shared/constants';

const store = factory();

const userId = 'test-user-id';
const diskSpace = 1;

function makeWrapper(props = {}) {
  return mount(UserStorage, {
    sync: false,
    store,
    propsData: {
      userId,
      value: diskSpace,
      ...props,
    },
  });
}

describe('userStorage', () => {
  let wrapper;
  let updateUser;
  beforeEach(() => {
    wrapper = makeWrapper();
    wrapper.setProps({ value: true }); // Allow watch event to trigger
    updateUser = jest.fn().mockReturnValue(Promise.resolve());
    wrapper.setMethods({ updateUser });
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
  it('submit should not call updateUser if space is blank', async () => {
    wrapper.setData({ space: '' });
    await wrapper.vm.$nextTick();
    return wrapper.vm.submit().then(() => {
      expect(updateUser).not.toHaveBeenCalled();
    });
  });
  it('submit should not call updateUser if unit is blank', async () => {
    wrapper.setData({ unit: '' });
    await wrapper.vm.$nextTick();
    return wrapper.vm.submit().then(() => {
      expect(updateUser).not.toHaveBeenCalled();
    });
  });
  it('submit should not call updateUser if space is negative', async () => {
    wrapper.setData({ space: -100 });
    await wrapper.vm.$nextTick();
    return wrapper.vm.submit().then(() => {
      expect(updateUser).not.toHaveBeenCalled();
    });
  });
  it('submit should call updateUser if form is valid', async () => {
    wrapper.setData({ space: 100, unit: 'ONE_TB' });
    await wrapper.vm.$nextTick();
    return wrapper.vm.submit().then(() => {
      expect(updateUser).toHaveBeenCalledWith({ id: userId, disk_space: 100 * ONE_TB });
    });
  });
});
