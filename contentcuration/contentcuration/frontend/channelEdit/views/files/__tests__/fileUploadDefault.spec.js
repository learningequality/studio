import { mount } from '@vue/test-utils';
import FileUploadDefault from '../FileUploadDefault';
import Uploader from 'shared/views/files/Uploader';

function makeWrapper() {
  return mount(FileUploadDefault, {
    attachToDocument: true,
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
  it('Uploader emitted an uploading event', () => {
    let wrapper = makeWrapper();
    wrapper.find(Uploader).vm.$emit('uploading', 'test');
    expect(wrapper.emitted('uploading')[0][0]).toBe('test');
  });
});
