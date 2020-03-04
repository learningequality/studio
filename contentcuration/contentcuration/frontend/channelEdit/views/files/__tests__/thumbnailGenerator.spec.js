import { mount } from '@vue/test-utils';
import ThumbnailGenerator from '../thumbnails/ThumbnailGenerator';
import store from '../../../store';

function makeWrapper(filePath) {
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
    let generateVideoThumbnail = jest.fn();
    let videoWrapper = makeWrapper('test.mp4');
    videoWrapper.setMethods({ generateVideoThumbnail });
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
    wrapper.vm.generate();
    expect(wrapper.find({ ref: 'error' }).isVisible()).toBe(true);
  });
});
