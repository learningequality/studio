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
      languageId: 'en',
      presetID: 'video_subtitle',
    },
    computed: {
      file() {
        return {
          id: 'test',
          language: {
            id: 'en',
          },
          uploading: Boolean(props.progress),
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
    wrapper.find(Uploader).vm.$emit('uploading', [{ id: 'file1' }, { id: 'file2' }]);
    expect(wrapper.emitted('uploading')[0][0].id).toBe('file1');
    expect(wrapper.emitted('uploading')[0][0].language.id).toBe('en');
  });
  it('uploading should be true if progress < 100', () => {
    expect(wrapper.find('[data-test="uploading"]').exists()).toBe(false);
    let testwrapper = makeWrapper({ progress: 50 });
    expect(testwrapper.find('[data-test="uploading"]').exists()).toBe(true);
  });
  it('should disable ability to upload other files during a file upload', () => {
    let testwrapper = makeWrapper({ progress: 50 });
    expect(testwrapper.find('[data-test="upload-file"]').exists()).toBe(false);
  });
  it('clicking remove button should emit remove event with file id', () => {
    let wrapper = makeWrapper({ id: 'test-remove' });
    wrapper.find('[data-test="remove"]').trigger('click');
    expect(wrapper.emitted('remove')[0][0]).toBe('test-remove');
  });
});
