import { mount } from '@vue/test-utils';
import FileStorage from '../FileStorage';

function makeWrapper(availableSpace = null) {
  return mount(FileStorage, {
    attachToDocument: true,
    computed: {
      storageRequestUrl() {
        return '';
      },
      totalSpace() {
        return 100;
      },
      availableSpace() {
        return availableSpace === null ? 50 : availableSpace;
      },
    },
  });
}

describe('fileStorage', () => {
  it('should reflect the correct storage percentage', () => {
    let wrapper = makeWrapper();
    expect(wrapper.vm.totalSpace).toBe(100);
    expect(wrapper.vm.usedSpace).toBe(50);
    expect(wrapper.vm.storagePercent).toBe(50);
  });
  it('should indicate if storage is full', () => {
    let wrapper = makeWrapper(0);
    expect(wrapper.vm.storageIsFull).toBe(true);
  });
  it('should show a warning if storage is almost full', () => {
    let wrapper = makeWrapper(10);
    expect(wrapper.vm.showWarning).toBe(true);
  });
});
