import { mount } from '@vue/test-utils';
import ThumbnailGenerator from '../thumbnails/ThumbnailGenerator';
import { factory } from '../../../store';

async function makeWrapper(filePath) {
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

  const handleGenerated = jest.spyOn(wrapper.vm, 'handleGenerated');
  handleGenerated.mockImplementation(() => {});

  return [wrapper, { fileExists, generateVideoThumbnail, handleFiles, handleGenerated }];
}

describe('thumbnailGenerator', () => {
  let wrapper, mocks;

  it.each(
    ['test.mp4', 'test.webm', 'test.mp3'],
    'correct generation code should be called for %s',
    async fileName => {
      [wrapper, mocks] = await makeWrapper(fileName);
      await wrapper.vm.generate();
      expect(mocks.generateVideoThumbnail).toHaveBeenCalled();
    },
  );

  it('error alert should show if the file path is an unrecognized type', async () => {
    [wrapper, mocks] = await makeWrapper('test.wut');
    await wrapper.vm.generate();
    expect(wrapper.vm.showErrorAlert).toBe(true);
  });

  it('handleGenerated should not call handleFiles if cancelled', async () => {
    [wrapper, mocks] = await makeWrapper('test.wut');
    await wrapper.setData({ cancelled: true });
    wrapper.vm.handleGenerated('');
    expect(mocks.handleFiles).not.toHaveBeenCalled();
  });
});
