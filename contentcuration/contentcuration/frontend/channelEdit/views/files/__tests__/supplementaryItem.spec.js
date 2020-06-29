import { mount } from '@vue/test-utils';
import SupplementaryItem from '../supplementaryLists/SupplementaryItem';
import store from '../../../store';
import Uploader from 'shared/views/files/Uploader';

function makeWrapper(props = {}) {
  return mount(SupplementaryItem, {
    store,
    attachToDocument: true,
    propsData: {
      fileId: 'test',
      presetID: 'video_subtitle',
    },
    computed: {
      file() {
        return {
          id: 'test',
          language: {
            id: 'en',
          },
          uploading: props.progress < 1,
          ...props,
        };
      },
    },
  });
}

describe('supplementaryItem', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  it('setting readonly should disable uploading', () => {
    wrapper.setProps({ readonly: true });
    expect(wrapper.find('[data-test="upload-file"]').exists()).toBe(false);
  });
  it('setting readonly should disable removing', () => {
    wrapper.setProps({ readonly: true });
    expect(wrapper.find('[data-test="remove"]').exists()).toBe(false);
  });
  it('should emit an uploading event when Uploader starts uploading file', () => {
    wrapper.find(Uploader).vm.$emit('uploading', { checksum: 'file1' });
    expect(wrapper.emitted('uploading')[0][0].checksum).toBe('file1');
  });
  it('uploading should be true if progress < 1', () => {
    expect(wrapper.find('[data-test="uploading"]').exists()).toBe(false);
    let testwrapper = makeWrapper({ progress: 0.5 });
    expect(testwrapper.find('[data-test="uploading"]').exists()).toBe(true);
  });
  it('should disable ability to upload other files during a file upload', () => {
    let testwrapper = makeWrapper({ progress: 0.5 });
    expect(testwrapper.find('[data-test="upload-file"]').exists()).toBe(false);
  });
  it('clicking remove button should emit remove event with file id', () => {
    let wrapper = makeWrapper({ id: 'test-remove' });
    wrapper.find('[data-test="remove"]').trigger('click');
    expect(wrapper.emitted('remove')[0][0]).toBe('test-remove');
  });
});
