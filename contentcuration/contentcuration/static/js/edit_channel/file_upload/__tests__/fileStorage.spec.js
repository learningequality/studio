import { mount } from '@vue/test-utils';
import FileStorage from '../views/FileStorage.vue';
import State from 'edit_channel/state';

function makeWrapper(user) {
  State.current_user = {
    disk_space: 100,
    available_space: 50,
    ...user,
    get: function(field) {
      return this[field];
    },
  };
  return mount(FileStorage, {
    attachToDocument: true,
    computed: {
      storageRequestUrl() {
        return '';
      },
    },
  });
}

describe('fileStorage', () => {
  it('should reflect the correct storage percentage', () => {
    let wrapper = makeWrapper();
    expect(wrapper.vm.totalStorage).toBe(100);
    expect(wrapper.vm.usedStorage).toBe(50);
    expect(wrapper.vm.storagePercent).toBe(50);
  });
  it('should indicate if storage is full', () => {
    let wrapper = makeWrapper({ available_space: 0 });
    expect(wrapper.vm.storageIsFull).toBe(true);
  });
  it('should show a warning if storage is almost full', () => {
    let wrapper = makeWrapper({ available_space: 10 });
    expect(wrapper.vm.showWarning).toBe(true);
  });
});
