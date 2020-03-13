import { mount } from '@vue/test-utils';
import FileStatusText from '../FileStatusText.vue';
import store from '../../../store';

const files = [{ id: 'file-1' }, { id: 'file-2', error: { type: 'error' } }];

function makeWrapper(fileIds, uploading) {
  return mount(FileStatusText, {
    store,
    attachToDocument: true,
    propsData: {
      fileIds,
    },
    computed: {
      files() {
        return files.filter(f => fileIds.includes(f.id));
      },
      uploading() {
        return uploading;
      },
      message() {
        return 'noooooo';
      },
    },
  });
}

describe('fileStatusText', () => {
  it('should show error text if a file has an error', () => {
    let wrapper = makeWrapper(['file-1', 'file-2']);
    expect(wrapper.find('[data-test="error"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="progress"]').exists()).toBe(false);

    wrapper = makeWrapper(['file-1']);
    expect(wrapper.find('[data-test="error"]').exists()).toBe(false);
  });
  it('should hide upload link in readonly mode', () => {
    let wrapper = makeWrapper(['file-2']);
    wrapper.setProps({ readonly: true });
    expect(wrapper.find('[data-test="upload"]').exists()).toBe(false);
  });
  it('should indicate if one of the files is uploading', () => {
    let wrapper = makeWrapper(['file-1'], true);
    expect(wrapper.find('[data-test="progress"]').exists()).toBe(true);
  });
  it('should show nothing if files are done uploading', () => {
    let wrapper = makeWrapper(['file-1'], false);
    expect(wrapper.find('[data-test="error"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="progress"]').exists()).toBe(false);
  });
});
