import { mount } from '@vue/test-utils';
import ContentNodeThumbnail from '../thumbnails/ContentNodeThumbnail';
import { factory } from '../../../store';
import IconButton from 'shared/views/IconButton';

const testThumbnail = {
  id: 'test-image',
  original_filename: 'image.png',
  url: 'image.png',
  file_size: 100,
  preset: {
    id: 'document_thumbnail',
    thumbnail: true,
    supplementary: true,
  },
};

const testDocument = {
  id: 'test-document',
  original_filename: 'image.pdf',
  url: 'image.pdf',
  file_size: 100,
  preset: {
    id: 'document',
    supplementary: false,
  },
};

const fileUploadId = 'upload-id';

function makeWrapper(props = {}, progress) {
  const store = factory();
  store.commit('file/ADD_FILE', {
    id: fileUploadId,
    loaded: progress,
    total: 1,
    url: 'new.png',
    file_size: 100,
    original_filename: 'new.png',
    preset: {
      id: 'document_thumbnail',
      thumbnail: true,
      supplementary: true,
    },
  });
  return mount(ContentNodeThumbnail, {
    store,
    attachTo: document.body,
    propsData: props,
    computed: {
      node() {
        return {
          files: [],
          kind: 'document',
        };
      },
      getContentNodeFiles() {
        return () => {
          return [testThumbnail, testDocument];
        };
      },
    },
    stubs: {
      croppa: true,
      FileStatus: true,
      FileStatusText: true,
      VTooltip: true,
    },
  });
}

describe('thumbnail', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = makeWrapper();
  });

  describe('on render', () => {
    it('thumbnail should be shown if provided', async () => {
      await wrapper.setProps({ value: testThumbnail });
      expect(wrapper.findComponent('[data-test="thumbnail-image"]').exists()).toBe(true);
      expect(wrapper.findComponent('[data-test="thumbnail-image"]').vm.src).toBe(testThumbnail.url);
    });

    it('encoding should be shown over thumbnail if provided', async () => {
      const encoding = { base64: 'encoding' };
      await wrapper.setProps({ value: testThumbnail, encoding });
      expect(wrapper.findComponent('[data-test="thumbnail-image"]').vm.thumbnailSrc).toBe(
        encoding.base64,
      );
    });

    it('card should be shown if no thumbnail is provided', () => {
      expect(wrapper.findComponent('[data-test="default-image"]').exists()).toBe(true);
    });

    it('should exit any editing modes when node is changed', async () => {
      await wrapper.setData({ cropping: true });
      await wrapper.setProps({ nodeId: 'new-ndoe' });
      expect(wrapper.vm.cropping).toBe(false);
    });
  });

  describe('upload workflow', () => {
    beforeEach(async () => {
      wrapper = makeWrapper({ value: testThumbnail }, 0.5);
      await wrapper.setData({ fileUploadId });
    });

    it('progress should be shown during upload', () => {
      expect(wrapper.findComponent('[data-test="progress"]').exists()).toBe(true);
    });

    it('hasError should be true if file upload fails', () => {
      wrapper.vm.$store.commit('file/ADD_FILE', { id: fileUploadId, error: 'ERROR' });
      expect(wrapper.vm.hasError).toBe(true);
    });

    it('cancelling upload should revert to the original state', async () => {
      await wrapper.setData({ removeOnCancel: true });
      wrapper.vm.deleteFile = jest.fn();
      await wrapper.findComponent('[data-test="cancel-upload"]').trigger('click');
      expect(wrapper.vm.deleteFile).toHaveBeenCalled();
    });

    it('should set cropping equal true when uploadCompleteHandler is run', async () => {
      wrapper.vm.handleUploadComplete({ id: fileUploadId });
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.cropping).toBe(true);
    });
  });

  describe('cropping workflow', () => {
    const testEncoding = { base64: 'encoding' };

    beforeEach(async () => {
      await wrapper.setProps({ value: testThumbnail, encoding: testEncoding });
      await wrapper.setData({ cropping: true });
    });

    it('cropping image should use original thumbnail file, not encoding', () => {
      expect(wrapper.vm.thumbnailSrc).toBe(testThumbnail.url);
    });

    it('cropping tools should be available when cropping is true', () => {
      expect(wrapper.findComponent('[data-test="zoomin"]').exists()).toBe(true);
      expect(wrapper.findComponent('[data-test="zoomout"]').exists()).toBe(true);
    });

    it('save should emit an encoded event', async () => {
      await wrapper.setData({
        Cropper: {
          getMetadata() {
            return {};
          },
          generateDataUrl() {
            return 'new encoding';
          },
        },
      });
      await wrapper.findComponent('[data-test="save"]').trigger('click');
      expect(wrapper.emitted('encoded')[0][0]).toEqual({ base64: 'new encoding' });
      expect(wrapper.vm.cropping).toBe(false);
    });

    it('cancel should keep the original image by default', async () => {
      await wrapper.findComponent('[data-test="cancel"]').trigger('click');
      expect(wrapper.vm.cropping).toBe(false);
      expect(wrapper.emitted('input')).toBeUndefined();
    });

    it('cancel should revert to the previous image if removeOnCancel is true', async () => {
      await wrapper.setData({ removeOnCancel: true });
      await wrapper.findComponent('[data-test="cancel"]').trigger('click');
      expect(wrapper.vm.cropping).toBe(false);
    });
  });

  describe('generation workflow', () => {
    beforeEach(async () => {
      await wrapper.setProps({ nodeId: 'test' });
    });

    it('progress should be shown during generation', async () => {
      await wrapper.setData({ generating: true });
      await wrapper.vm.$nextTick();
      expect(wrapper.findComponent('[data-test="generating"]').exists()).toBe(true);
    });

    it('primary file path should return the first non-supplementary file', async () => {
      await wrapper.setProps({ nodeId: 'test' });
      expect(wrapper.vm.primaryFilePath).toBe(testDocument.url);
    });

    it('cancelling upload should revert to the original state', async () => {
      wrapper.vm.startGenerating();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();
      await wrapper.findComponent('[data-test="cancel-upload"]').trigger('click');
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.generating).toBe(false);
    });

    it('clicking generate button should set generating to true', async () => {
      wrapper.findComponent({ ref: 'generator' }).vm.$emit('generating');
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.generating).toBe(true);
    });
  });

  describe('remove workflow', () => {
    it('clicking remove button should emit an input event with a null value', async () => {
      await wrapper.setProps({ value: testThumbnail });
      await wrapper
        .findComponent('[data-test="remove"]')
        .findComponent(IconButton)
        .trigger('click');
      expect(wrapper.emitted('input')[0][0]).toBe(null);
    });
  });
});
