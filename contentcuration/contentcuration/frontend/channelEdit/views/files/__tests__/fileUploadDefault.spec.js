import { mount } from '@vue/test-utils';
import FileUploadDefault from '../FileUploadDefault';
import FileDropzone from 'shared/views/files/FileDropzone';
import storeFactory from 'shared/vuex/baseStore';

function makeWrapper() {
  return mount(FileUploadDefault, {
    store: storeFactory(),
    attachTo: document.body,
    props: {
      parentTitle: 'root',
    },
    computed: {
      currentNode() {
        return { id: 'test' };
      },
    },
    stubs: {
      FileStorage: true,
    },
  });
}

describe('fileUploadDefault', () => {
  it('handleFiles should get called on file drop', async () => {
    const handleFiles = jest.fn();
    const wrapper = makeWrapper();
    wrapper.setProps({ handleFiles });
    await wrapper.vm.$nextTick();
    const file = {
      checksum: 'test',
    };
    wrapper.findComponent(FileDropzone).vm.$emit('dropped', [file]);
    expect(handleFiles).toHaveBeenCalledWith([file]);
  });
  it('openFileDialog should get called on button click', async () => {
    const openFileDialog = jest.fn();
    const wrapper = makeWrapper();
    wrapper.setProps({ openFileDialog });
    await wrapper.vm.$nextTick();
    wrapper.findComponent('[data-test="upload"]').trigger('click');
    await wrapper.vm.$nextTick();
    expect(openFileDialog).toHaveBeenCalled();
  });
});
