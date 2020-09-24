import { mount } from '@vue/test-utils';
import FileUploadDefault from '../FileUploadDefault';
import FileDropzone from 'shared/views/files/FileDropzone';
import storeFactory from 'shared/vuex/baseStore';

function makeWrapper() {
  return mount(FileUploadDefault, {
    store: storeFactory(),
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
  it('handleFiles should get called on file drop', () => {
    const handleFiles = jest.fn();
    let wrapper = makeWrapper();
    wrapper.setProps({ handleFiles });
    const file = {
      checksum: 'test',
    };
    wrapper.find(FileDropzone).vm.$emit('dropped', [file]);
    expect(handleFiles).toHaveBeenCalledWith([file]);
  });
  it('openFileDialog should get called on button click', () => {
    const openFileDialog = jest.fn();
    let wrapper = makeWrapper();
    wrapper.setProps({ openFileDialog });
    wrapper.find('[data-test="upload"]').trigger('click');
    expect(openFileDialog).toHaveBeenCalled();
  });
});
