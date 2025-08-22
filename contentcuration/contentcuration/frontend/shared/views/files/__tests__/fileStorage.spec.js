import { mount } from '@vue/test-utils';
import FileStorage from '../FileStorage';

function makeWrapper(usedSpace = null) {
  const fetchUserStorage = jest.spyOn(FileStorage.methods, 'fetchUserStorage');
  fetchUserStorage.mockImplementation(() => Promise.resolve());

  const wrapper = mount(FileStorage, {
    attachTo: document.body,
    computed: {
      usedSpace() {
        return usedSpace === null ? 50 : usedSpace;
      },
      storageRequestUrl() {
        return '';
      },
      totalSpace() {
        return 100;
      },
    },
  });
  return [wrapper, { fetchUserStorage }];
}

describe('fileStorage', () => {
  let wrapper, mocks;

  afterEach(() => {
    wrapper.destroy();
    mocks.fetchUserStorage.mockRestore();
  });

  it('should reflect the correct storage percentage', () => {
    [wrapper, mocks] = makeWrapper();
    expect(wrapper.vm.totalSpace).toBe(100);
    expect(wrapper.vm.usedSpace).toBe(50);
    expect(wrapper.vm.storagePercent).toBe(50);
  });

  it('should indicate if storage is full', () => {
    [wrapper, mocks] = makeWrapper(100);
    expect(wrapper.vm.storageIsFull).toBe(true);
  });

  it('should show a warning if storage is almost full', () => {
    [wrapper, mocks] = makeWrapper(90);
    expect(wrapper.vm.showWarning).toBe(true);
  });
});
