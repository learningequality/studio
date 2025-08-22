import { mount } from '@vue/test-utils';
import FilePreview from '../FilePreview.vue';
import { factory } from '../../../store';

const store = factory();

function makeWrapper(props = {}) {
  return mount(FilePreview, {
    store,
    attachTo: document.body,
    stubs: {
      ContentRenderer: true,
    },
    computed: {
      file() {
        return {
          id: 'test',
          preset: {},
          checksum: 'checksum',
          url: 'path',
          file_format: 'mp4',
          ...props,
        };
      },
      node() {
        return {
          files: ['test'],
          title: 'Testing Node',
        };
      },
    },
  });
}

describe('filePreview', () => {
  it('should determine if the content is previewable', () => {
    function test(file_format, previewable) {
      const wrapper = makeWrapper({ file_format });
      expect(wrapper.vm.isPreviewable).toBe(previewable);
    }
    test('mp4', true);
    test('webm', true);
    test('pdf', true);
    test('mp3', true);
    test('epub', true);
    test('zip', true);
    test('wut', false);
  });
  it('clicking view fullscreen button should set fullscreen to true', async () => {
    const wrapper = makeWrapper();
    wrapper.findComponent('[data-test="openfullscreen"]').trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.fullscreen).toBe(true);
  });
  it('clicking close fullscreen button should set fullscreen to false', async () => {
    const wrapper = makeWrapper({ file_format: 'mp4' });
    wrapper.setData({ fullscreen: true });
    await wrapper.vm.$nextTick();
    wrapper.findComponent('[data-test="closefullscreen"]').trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.fullscreen).toBe(false);

    const wrapperWebm = makeWrapper({ file_format: 'webm' });
    wrapperWebm.setData({ fullscreen: true });
    await wrapper.vm.$nextTick();
    wrapperWebm.findComponent('[data-test="closefullscreen"]').trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapperWebm.vm.fullscreen).toBe(false);
  });
});
