import { mount } from '@vue/test-utils';
import FileUploadDefault from '../views/FileUploadDefault.vue';
import Uploader from 'edit_channel/sharedComponents/Uploader.vue';

function makeWrapper() {
  return mount(FileUploadDefault, {
    attachToDocument: true,
    computed: {
      currentNode() {
        return { id: 'test' };
      },
    },
  });
}

describe('fileUploadDefault', () => {
  it('Uploader emitted uploading event should create files from node', () => {
    let wrapper = makeWrapper();
    let createNodesFromFiles = jest.fn();
    wrapper.setMethods({ createNodesFromFiles });
    wrapper.find(Uploader).vm.$emit('uploading', 'test');
    expect(createNodesFromFiles).toHaveBeenCalledWith('test');
  });
});
