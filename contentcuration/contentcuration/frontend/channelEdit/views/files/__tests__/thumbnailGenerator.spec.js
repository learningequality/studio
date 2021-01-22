import { mount } from '@vue/test-utils';
import ThumbnailGenerator from '../thumbnails/ThumbnailGenerator';
import { factory } from '../../../store';

const nodeId = 'test';
function makeWrapper(filePath, generationList) {
  const store = factory();
  return mount(ThumbnailGenerator, {
    store,
    attachToDocument: true,
    propsData: { nodeId },
    computed: {
      filePath() {
        return filePath;
      },
      contentNodeThumbnailGenerations() {
        return generationList || [];
      },
    },
  });
}

describe('thumbnailGenerator', () => {
  it('correct generation code should be called', () => {
    let generateVideoThumbnail = jest.fn();
    let videoWrapper = makeWrapper('test.mp4');
    const fileExists = jest.fn(() => true);
    videoWrapper.setMethods({ fileExists, generateVideoThumbnail });
    videoWrapper.vm.generate();
    expect(generateVideoThumbnail).toHaveBeenCalled();

    let generateAudioThumbnail = jest.fn();
    let audioWrapper = makeWrapper('test.mp3');
    audioWrapper.setMethods({ generateAudioThumbnail });
    audioWrapper.vm.generate();
    expect(generateAudioThumbnail).toHaveBeenCalled();
  });
  it('error alert should show if the file path is an unrecognized type', () => {
    let wrapper = makeWrapper('test.wut');
    const fileExists = jest.fn(() => true);
    wrapper.setMethods({ fileExists });
    wrapper.vm.generate();
    expect(wrapper.vm.showErrorAlert).toBe(true);
  });
  it('handleGenerated should not call handleFiles if cancelled', () => {
    let wrapper = makeWrapper('test.wut', [nodeId]);
    const handleFiles = jest.fn(() => true);
    wrapper.setMethods({ handleFiles });
    wrapper.vm.handleGenerated('');
    expect(handleFiles).not.toHaveBeenCalled();
  });
});
