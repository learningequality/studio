import { mount } from '@vue/test-utils';
import FileStatus from '../FileStatus.vue';
import store from '../../../store';

const files = [
  { id: 'file-1', progress: 100 },
  { id: 'file-2', progress: 50 },
  { id: 'file-3', progress: undefined, error: 'error' },
];

function makeWrapper(fileIDs, progress) {
  return mount(FileStatus, {
    store,
    attachToDocument: true,
    propsData: {
      fileIDs: fileIDs,
    },
    computed: {
      files() {
        return files.filter(f => fileIDs.includes(f.id));
      },
      progress() {
        return progress;
      },
    },
  });
}

describe('fileStatus', () => {
  it('should indicate if one of the files has an error', () => {
    let wrapper = makeWrapper(['file-1', 'file-2', 'file-3']);
    expect(wrapper.vm.hasErrors).toBe(true);

    wrapper = makeWrapper(['file-1', 'file-2']);
    expect(wrapper.vm.hasErrors).toBe(false);
  });
  it('should indicate if one of the files is uploading', () => {
    let wrapper = makeWrapper(['file-1', 'file-2'], 50);
    expect(wrapper.find('[data-test="progress"]').exists()).toBe(true);
  });
  it('should indicate if all files have finished uploading', () => {
    let wrapper = makeWrapper(['file-1', 'file-2'], 100);
    expect(wrapper.find('[data-test="done"]').exists()).toBe(true);
  });
});
