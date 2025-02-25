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
    attachToDocument: true,
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
    it('thumbnail should be shown if provided', () => {
      wrapper.setProps({ value: testThumbnail });
      expect(wrapper.find('[data-test="thumbnail-image"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="thumbnail-image"]').vm.src).toBe(testThumbnail.url);
    });
    it('encoding should be shown over thumbnail if provided', () => {
      const encoding = { base64: 'encoding' };
      wrapper.setProps({ value: testThumbnail, encoding });
      expect(wrapper.find('[data-test="thumbnail-image"]').vm.thumbnailSrc).toBe(encoding.base64);
    });
    it('card should be shown if no thumbnail is provided', () => {
      expect(wrapper.find('[data-test="default-image"]').exists()).toBe(true);
    });
    it('should exit any editing modes when node is changed', () => {
      wrapper.setData({ cropping: true });
      wrapper.setProps({ nodeId: 'new-ndoe' });
      expect(wrapper.vm.cropping).toBe(false);
    });
  });
  describe('upload workflow', () => {
    beforeEach(() => {
      wrapper = makeWrapper({ value: testThumbnail }, 0.5);
      wrapper.setData({ fileUploadId });
    });
    it('progress should be shown during upload', () => {
      expect(wrapper.find('[data-test="progress"]').exists()).toBe(true);
    });
    it('hasError should be true if file upload fails', () => {
      wrapper.vm.$store.commit('file/ADD_FILE', { id: fileUploadId, error: 'ERROR' });
      expect(wrapper.vm.hasError).toBe(true);
    });
    it('cancelling upload should revert to the original state', () => {
      wrapper.setData({ removeOnCancel: true });
      wrapper.vm.deleteFile = jest.fn();
      wrapper.find('[data-test="cancel-upload"]').trigger('click');
      expect(wrapper.vm.deleteFile).toHaveBeenCalled();
    });
    it('should set cropping equal true when uploadCompleteHandler is run', () => {
      wrapper.vm.handleUploadComplete({ id: fileUploadId });
      return wrapper.vm.$nextTick().then(() => {
        expect(wrapper.vm.cropping).toBe(true);
      });
    });
  });
  describe('cropping workflow', () => {
    const testEncoding = { base64: 'encoding' };
    beforeEach(() => {
      wrapper.setProps({ value: testThumbnail, encoding: testEncoding });
      wrapper.setData({ cropping: true });
    });
    it('cropping image should use original thumbnail file, not encoding', () => {
      expect(wrapper.vm.thumbnailSrc).toBe(testThumbnail.url);
    });
    it('cropping tools should be available when cropping is true', () => {
      expect(wrapper.find('[data-test="zoomin"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="zoomout"]').exists()).toBe(true);
    });
    it('save should emit an encoded event', () => {
      wrapper.setData({
        Cropper: {
          getMetadata() {
            return {};
          },
          generateDataUrl() {
            return 'new encoding';
          },
        },
      });
      wrapper.find('[data-test="save"]').trigger('click');
      expect(wrapper.emitted('encoded')[0][0]).toEqual({ base64: 'new encoding' });
      expect(wrapper.vm.cropping).toBe(false);
    });
    it('cancel should keep the original image by default', () => {
      wrapper.find('[data-test="cancel"]').trigger('click');
      expect(wrapper.vm.cropping).toBe(false);
      expect(wrapper.emitted('input')).toBeUndefined();
    });
    it('cancel should revert to the previous image if removeOnCancel is true', () => {
      wrapper.setData({ removeOnCancel: true });
      wrapper.find('[data-test="cancel"]').trigger('click');
      expect(wrapper.vm.cropping).toBe(false);
    });
  });
  describe('generation workflow', () => {
    beforeEach(() => {
      wrapper.setProps({ nodeId: 'test' });
    });
    it('progress should be shown during generation', () => {
      wrapper.setData({ generating: true });
      return wrapper.vm.$nextTick().then(() => {
        expect(wrapper.find('[data-test="generating"]').exists()).toBe(true);
      });
    });
    it('primary file path should return the first non-supplementary file', () => {
      wrapper.setProps({ nodeId: 'test' });
      expect(wrapper.vm.primaryFilePath).toBe(testDocument.url);
    });
    it('cancelling upload should revert to the original state', () => {
      wrapper.vm.startGenerating();
      return wrapper.vm.$nextTick().then(() => {
        wrapper.find('[data-test="cancel-upload"]').trigger('click');
        expect(wrapper.vm.generating).toBe(false);
      });
    });
    it('clicking generate button should set generating to true', () => {
      wrapper.find({ ref: 'generator' }).vm.$emit('generating');
      expect(wrapper.vm.generating).toBe(true);
    });
  });
  describe('remove workflow', () => {
    it('clicking remove button should emit an input event with a null value', () => {
      wrapper.setProps({ value: testThumbnail });
      wrapper.find('[data-test="remove"]').find(IconButton).vm.$emit('click');
      expect(wrapper.emitted('input')[0][0]).toBe(null);
    });
  });
});
