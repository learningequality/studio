import { mount } from '@vue/test-utils';
import SupplementaryItem from '../supplementaryLists/SupplementaryItem';
import { factory } from '../../../store';
import Uploader from 'shared/views/files/Uploader';

function makeWrapper(props = {}) {
  const store = factory();
  return mount(SupplementaryItem, {
    store,
    attachTo: document.body,
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

  it('setting readonly should disable uploading', async () => {
    await wrapper.setProps({ readonly: true });
    expect(wrapper.findComponent('[data-test="upload-file"]').exists()).toBe(false);
  });

  it('setting readonly should disable removing', async () => {
    await wrapper.setProps({ readonly: true });
    expect(wrapper.findComponent('[data-test="remove"]').exists()).toBe(false);
  });

  it('should call uploadingHandler when Uploader starts uploading file', async () => {
    wrapper.findComponent(Uploader).vm.uploadingHandler({ id: 'file1' });
    expect(wrapper.vm.fileUploadId).toBe('file1');
  });

  it('should call uploadCompleteHandler when Uploader finishes uploading file', async () => {
    const uploadCompleteHandler = jest.fn();
    await wrapper.setProps({ uploadCompleteHandler });
    wrapper.findComponent(Uploader).vm.uploadCompleteHandler({ id: 'file1' });
    expect(uploadCompleteHandler).toHaveBeenCalledWith({ id: 'file1' });
  });

  it('uploading should be true if progress < 1', async () => {
    expect(wrapper.findComponent('[data-test="uploading"]').exists()).toBe(false);
    const testwrapper = makeWrapper({ progress: 0.5 });
    expect(testwrapper.findComponent('[data-test="uploading"]').exists()).toBe(true);
  });

  it('should disable ability to upload other files during a file upload', async () => {
    const testwrapper = makeWrapper({ progress: 0.5 });
    expect(testwrapper.findComponent('[data-test="upload-file"]').exists()).toBe(false);
  });

  it('clicking remove button should emit remove event with file id', async () => {
    const wrapper = makeWrapper({ id: 'test-remove' });
    await wrapper.findComponent('[data-test="remove"]').trigger('click');
    expect(wrapper.emitted('remove')[0][0]).toBe('test-remove');
  });
});
