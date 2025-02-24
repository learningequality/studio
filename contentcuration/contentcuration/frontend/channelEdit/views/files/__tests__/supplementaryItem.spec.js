import { mount } from '@vue/test-utils';
import SupplementaryItem from '../supplementaryLists/SupplementaryItem';
import { factory } from '../../../store';
import Uploader from 'shared/views/files/Uploader';

function makeWrapper(props = {}) {
  const store = factory();
  return mount(SupplementaryItem, {
    store,
    attachTo: 'body',
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
  it('should call uploadingHandler when Uploader starts uploading file', () => {
    wrapper.find(Uploader).vm.uploadingHandler({ id: 'file1' });
    expect(wrapper.vm.fileUploadId).toBe('file1');
  });
  it('should call uploadCompleteHandler when Uploader finishes uploading file', () => {
    const uploadCompleteHandler = jest.fn();
    wrapper.setProps({ uploadCompleteHandler });
    wrapper.find(Uploader).vm.uploadCompleteHandler({ id: 'file1' });
    expect(uploadCompleteHandler).toHaveBeenCalledWith({ id: 'file1' });
  });
  it('uploading should be true if progress < 1', () => {
    expect(wrapper.find('[data-test="uploading"]').exists()).toBe(false);
    const testwrapper = makeWrapper({ progress: 0.5 });
    expect(testwrapper.find('[data-test="uploading"]').exists()).toBe(true);
  });
  it('should disable ability to upload other files during a file upload', () => {
    const testwrapper = makeWrapper({ progress: 0.5 });
    expect(testwrapper.find('[data-test="upload-file"]').exists()).toBe(false);
  });
  it('clicking remove button should emit remove event with file id', () => {
    const wrapper = makeWrapper({ id: 'test-remove' });
    wrapper.find('[data-test="remove"]').trigger('click');
    expect(wrapper.emitted('remove')[0][0]).toBe('test-remove');
  });
});
