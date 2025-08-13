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

  beforeEach(async () => {
    wrapper = makeWrapper();
    await wrapper.setProps({ value: true }); // Allow watch event to trigger
    updateUser = jest.spyOn(wrapper.vm, 'updateUser');
    updateUser.mockResolvedValue(null);
  });

  it('clicking cancel should reset the values', async () => {
    wrapper = makeWrapper({ showCancel: true });
    await wrapper.setData({ space: diskSpace + 100 });
    await wrapper.findComponent('[data-test="cancel"]').trigger('click');
    expect(wrapper.vm.space).toBe(diskSpace);
  });

  it('submitting form should call submit', async () => {
    const submit = jest.spyOn(wrapper.vm, 'submit');
    await wrapper.findComponent({ ref: 'form' }).trigger('submit');
    expect(submit).toHaveBeenCalled();
  });

  it('submit should not call updateUser if space is blank', async () => {
    await wrapper.setData({ space: '' });
    await wrapper.vm.submit();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('submit should not call updateUser if unit is blank', async () => {
    await wrapper.setData({ unit: '' });
    await wrapper.vm.submit();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('submit should not call updateUser if space is negative', async () => {
    await wrapper.setData({ space: -100 });
    await wrapper.vm.submit();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('submit should call updateUser if form is valid', async () => {
    await wrapper.setData({ space: 100, unit: 'ONE_TB' });
    await wrapper.vm.submit();
    expect(updateUser).toHaveBeenCalledWith({ id: userId, disk_space: 100 * ONE_TB });
  });
});
