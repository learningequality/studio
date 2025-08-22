import { mount } from '@vue/test-utils';
import ThumbnailGenerator from '../thumbnails/ThumbnailGenerator';
import { factory } from '../../../store';

function makeWrapper(filePath) {
  const store = factory();
  const handleFiles = jest.fn(() => true);

  const wrapper = mount(ThumbnailGenerator, {
    store,
    attachTo: document.body,
    propsData: {
      filePath,
      presetID: 'video_thumbnail',
      handleFiles,
    },
  });

  const fileExists = jest.spyOn(wrapper.vm, 'fileExists');
  fileExists.mockImplementation(() => true);

  const generateVideoThumbnail = jest.spyOn(wrapper.vm, 'generateVideoThumbnail');
  generateVideoThumbnail.mockImplementation(() => Promise.resolve());

  return [wrapper, { fileExists, generateVideoThumbnail, handleFiles }];
}

describe('thumbnailGenerator', () => {
  let wrapper, mocks;

  it.each(
    ['test.mp4', 'test.webm', 'test.mp3'],
    'correct generation code should be called',
    fileName => {
      [wrapper, mocks] = makeWrapper(fileName);
      wrapper.vm.generate();
      expect(mocks.generateVideoThumbnail).toHaveBeenCalled();
    },
  );

  it('error alert should show if the file path is an unrecognized type', () => {
    [wrapper, mocks] = makeWrapper('test.wut');
    wrapper.vm.generate();
    expect(wrapper.vm.showErrorAlert).toBe(true);
  });

  it('handleGenerated should not call handleFiles if cancelled', async () => {
    [wrapper, mocks] = makeWrapper('test.wut');
    await wrapper.setData({ cancelled: true });
    wrapper.vm.handleGenerated('');
    expect(mocks.handleFiles).not.toHaveBeenCalled();
  });
});
