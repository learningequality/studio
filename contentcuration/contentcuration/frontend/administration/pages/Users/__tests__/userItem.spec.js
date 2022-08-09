import { mount } from '@vue/test-utils';
import router from '../../../router';
import { factory } from '../../../store';
import { RouteNames } from '../../../constants';
import UserItem from '../UserItem';

const store = factory();

const userId = 'test-user-id';
const user = {
  id: userId,
  name: 'Testy User',
  date_joined: new Date(),
  last_login: new Date(),
  disk_space: 20,
};

function makeWrapper() {
  router.replace({ name: RouteNames.USERS }).catch(() => {});
  return mount(UserItem, {
    router,
    store,
    propsData: {
      userId,
      value: [],
    },
    computed: {
      user() {
        return user;
      },
    },
    stubs: {
      UserActionsDropdown: true,
    },
  });
}

describe('userItem', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  it('selecting the user should emit list with user id', () => {
    wrapper.vm.selected = true;
    expect(wrapper.emitted('input')[0][0]).toEqual([userId]);
  });
  it('deselecting the user should emit list without user id', () => {
    wrapper.setProps({ value: [userId] });
    wrapper.vm.selected = false;
    expect(wrapper.emitted('input')[0][0]).toEqual([]);
  });
});
