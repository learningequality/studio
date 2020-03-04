import { mount } from '@vue/test-utils';
import ThumbnailToolbarIcon from '../thumbnails/ThumbnailToolbarIcon';

function makeWrapper() {
  return mount(ThumbnailToolbarIcon, {
    attachToDocument: true,
    propsData: {
      icon: 'test',
      tooltip: 'test',
    },
  });
}

describe('thumbnailToolbarIcon', () => {
  let wrapper;
  let button;
  beforeEach(() => {
    wrapper = makeWrapper();
    button = wrapper.find('[data-test="button"]');
  });
  it('mouse actions should be re-emitted', () => {
    button.trigger('click');
    expect(wrapper.emitted('click')).toBeTruthy();
    button.trigger('mousedown');
    expect(wrapper.emitted('mousedown')).toBeTruthy();
    button.trigger('mouseup');
    expect(wrapper.emitted('mouseup')).toBeTruthy();
  });
  it('accessibility keyboard actions should be re-emitted', () => {
    button.trigger('keyup.enter');
    expect(wrapper.emitted('mouseup')).toBeTruthy();
    button.trigger('keydown.enter');
    expect(wrapper.emitted('mousedown')).toBeTruthy();
  });
});
