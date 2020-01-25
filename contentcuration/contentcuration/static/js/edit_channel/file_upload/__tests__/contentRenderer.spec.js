import Vue from 'vue';
import Vuex, { Store } from 'vuex';
import { mount } from '@vue/test-utils';
import ContentRenderer from '../views/ContentRenderer.vue';
import fileUploadsModule from 'edit_channel/vuexModules/fileUpload';

Vue.use(Vuex);
const store = new Store({
  modules: {
    fileUploads: fileUploadsModule,
  },
});

function makeWrapper(props = {}) {
  return mount(ContentRenderer, {
    store,
    attachToDocument: true,
    propsData: {
      file: {
        id: 'test',
        file_on_disk: 'path',
        checksum: 'checksum',
        file_format: 'mp3',
        preset: {},
        ...props,
      },
    },
    computed: {
      uploading() {
        return this.file.progress !== 100;
      },
    },
  });
}

describe('contentRenderer', () => {
  it('should display file status during upload', () => {
    let wrapper = makeWrapper({ progress: 50 });
    expect(wrapper.find('[data-test="progress"]').exists()).toBe(true);
  });
  it('should display preview not supported if file is not supported', () => {
    let wrapper = makeWrapper({ file_format: 'wut', progress: 100 });
    expect(wrapper.find('[data-test="not-supported"]').exists()).toBe(true);
  });
});
