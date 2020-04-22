import { mount } from '@vue/test-utils';
import FileUploadDefault from '../FileUploadDefault';
import Uploader from 'shared/views/files/Uploader';
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
  it('Uploader emitted an uploading event', () => {
    let wrapper = makeWrapper();
    const file = {
      checksum: 'test',
    };
    wrapper.find(Uploader).vm.$emit('uploading', [file]);
    expect(wrapper.emitted('uploading')[0][0]).toEqual([file]);
  });
});
