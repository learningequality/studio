import { mount } from '@vue/test-utils';
import FilePreview from '../views/FilePreview.vue';

function makeWrapper(props = {}) {
  return mount(FilePreview, {
    attachToDocument: true,
    propsData: {
      file: {
        id: 'test',
        preset: {},
        checksum: 'checksum',
        file_on_disk: 'path',
        file_format: 'mp3',
        ...props,
      },
      node: {
        files: [],
        title: 'Testing Node',
      },
    },
    stubs: {
      ContentRenderer: true,
    },
  });
}

describe('filePreview', () => {
  it('should determine if the content is previewable', () => {
    function test(file_format, previewable) {
      let wrapper = makeWrapper({ file_format });
      expect(wrapper.vm.isPreviewable).toBe(previewable);
    }
    test('mp4', true);
    test('pdf', true);
    test('mp3', true);
    test('epub', true);
    test('zip', true);
    test('wut', false);
  });
  it('clicking view fullscreen button should set fullscreen to true', () => {
    let wrapper = makeWrapper({ file_format: 'mp4' });
    wrapper.find('[data-test="openfullscreen"]').trigger('click');
    expect(wrapper.vm.fullscreen).toBe(true);
  });
  it('clicking close fullscreen button should set fullscreen to false', () => {
    let wrapper = makeWrapper({ file_format: 'mp4' });
    wrapper.find('[data-test="openfullscreen"]').trigger('click');
    wrapper.find('[data-test="closefullscreen"]').trigger('click');
    expect(wrapper.vm.fullscreen).toBe(false);
  });
});
