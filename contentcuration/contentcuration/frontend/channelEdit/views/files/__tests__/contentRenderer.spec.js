import { mount } from '@vue/test-utils';
import ContentRenderer from '../ContentRenderer.vue';
import { factory } from '../../../store';

const store = factory();

const testFile = {
  id: 'test',
  url: '',
};

function makeWrapper(props = {}) {
  return mount(ContentRenderer, {
    store,
    attachTo: document.body,
    propsData: {
      file: {
        id: 'test',
        url: 'path',
        checksum: 'checksum',
        file_format: 'mp3',
        preset: {},
        ...props,
      },
    },
    computed: {
      getContentNodeFileById() {
        return () => {
          return {
            ...testFile,
            ...props,
          };
        };
      },
    },
  });
}

describe('contentRenderer', () => {
  it('should display file status during upload', () => {
    const wrapper = makeWrapper({ uploading: true });
    expect(wrapper.find('[data-test="progress"]').exists()).toBe(true);
  });
  it('should display preview not supported if file is not supported', () => {
    const wrapper = makeWrapper({ file_format: 'wut' });
    expect(wrapper.find('[data-test="not-supported"]').exists()).toBe(true);
  });
  it('should display an error if file failed', () => {
    const wrapper = makeWrapper({ error: 'nope' });
    expect(wrapper.find('[data-test="progress"]').exists()).toBe(true);
  });
});
