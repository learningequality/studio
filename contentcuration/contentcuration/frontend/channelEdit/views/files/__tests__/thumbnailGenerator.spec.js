import { mount } from '@vue/test-utils';
import ThumbnailGenerator from '../thumbnails/ThumbnailGenerator';
import { factory } from '../../../store';

function makeWrapper(filePath) {
  const store = factory();
  return mount(ThumbnailGenerator, {
    store,
    attachToDocument: true,
    propsData: {
      filePath,
      presetID: 'video_thumbnail',
    },
  });
}

describe('thumbnailGenerator', () => {
  it('correct generation code should be called', () => {
    const generateVideoThumbnail = jest.fn();
    const videoWrapper = makeWrapper('test.mp4');
    const fileExists = jest.fn(() => true);
    videoWrapper.setMethods({ fileExists, generateVideoThumbnail });
    videoWrapper.vm.generate();
    expect(generateVideoThumbnail).toHaveBeenCalled();

    const videoWrapperWebm = makeWrapper('test.webm');
    videoWrapperWebm.setMethods({ fileExists, generateVideoThumbnail });
    videoWrapperWebm.vm.generate();
    expect(generateVideoThumbnail).toHaveBeenCalled();

    const generateAudioThumbnail = jest.fn();
    const audioWrapper = makeWrapper('test.mp3');
    audioWrapper.setMethods({ generateAudioThumbnail });
    audioWrapper.vm.generate();
    expect(generateAudioThumbnail).toHaveBeenCalled();
  });
  it('error alert should show if the file path is an unrecognized type', () => {
    const wrapper = makeWrapper('test.wut');
    const fileExists = jest.fn(() => true);
    wrapper.setMethods({ fileExists });
    wrapper.vm.generate();
    expect(wrapper.vm.showErrorAlert).toBe(true);
  });
  it('handleGenerated should not call handleFiles if cancelled', () => {
    const wrapper = makeWrapper('test.wut');
    const handleFiles = jest.fn(() => true);
    wrapper.setMethods({ handleFiles });
    wrapper.setData({ cancelled: true });
    wrapper.vm.handleGenerated('');
    expect(handleFiles).not.toHaveBeenCalled();
  });
});
