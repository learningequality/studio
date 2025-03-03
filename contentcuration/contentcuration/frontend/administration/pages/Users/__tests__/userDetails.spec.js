import { mount } from '@vue/test-utils';
import router from '../../../router';
import { factory } from '../../../store';
import { RouteNames } from '../../../constants';
import UserDetails from '../UserDetails';

const store = factory();

const userId = 'test-user-id';
const user = {
  id: userId,
  name: 'Testy User',
  date_joined: new Date(),
  last_login: new Date(),
  disk_space: 20,
};
const details = {
  locations: [],
  used_space: 10,
  edit_channels: [],
  viewonly_channels: [],
};

async function makeWrapper(userProps = {}) {
  await router.replace({ name: RouteNames.USER, params: { userId } }).catch(() => {});
  return mount(UserDetails, {
    router,
    store,
    propsData: { userId },
    computed: {
      user() {
        return {
          ...user,
          ...userProps,
        };
      },
      policies() {
        return [];
      },
    },
    stubs: {
      UserActionsDropdown: true,
      UserPrivilegeModal: true,
    },
  });
}

describe('userDetails', () => {
  let wrapper;
  beforeEach(async () => {
    wrapper = await makeWrapper();
    wrapper.setData({ details });
  });
  it('clicking close should close the modal', () => {
    wrapper.vm.dialog = false;
    expect(wrapper.vm.$route.name).toBe(RouteNames.USERS);
  });
  describe('load', () => {
    it('should automatically close if loadUser does not find a channel', () => {
      wrapper.setMethods({
        loadUser: jest.fn().mockReturnValue(Promise.resolve()),
        loadUserDetails: jest.fn().mockReturnValue(Promise.resolve()),
      });
      return wrapper.vm.load().then(() => {
        expect(wrapper.vm.$route.name).toBe(RouteNames.USERS);
      });
    });
    it('load should call loadUser and loadUserDetails', () => {
      const loadUser = jest.fn().mockReturnValue(Promise.resolve({ id: userId }));
      const loadUserDetails = jest.fn().mockReturnValue(Promise.resolve(details));
      wrapper.setMethods({ loadUser, loadUserDetails });
      return wrapper.vm.load().then(() => {
        expect(loadUser).toHaveBeenCalled();
        expect(loadUserDetails).toHaveBeenCalled();
      });
    });
  });
  it('deleting user should close the modal', () => {
    wrapper.setData({ loading: false });
    wrapper.find('[data-test="dropdown"]').vm.$emit('deleted');
    wrapper.vm.$nextTick(() => {
      expect(wrapper.vm.$route.name).toBe(RouteNames.USERS);
    });
  });
  it('progress bar should reflect storage used', () => {
    expect(wrapper.vm.storageUsed).toBe(50);
  });
});
