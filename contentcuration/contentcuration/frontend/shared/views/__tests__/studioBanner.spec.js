import { mount } from '@vue/test-utils';
import StudioBanner from '../StudioBanner.vue';

describe('StudioBanner', () => {
  it('render with default props', () => {
    const wrapper = mount(StudioBanner, {
      propsData: {
        error: false,
      },
    });
    expect(wrapper.text()).toBe('');
  });
  it('render with error and slot content', () => {
    const wrapper = mount(StudioBanner, {
      propsData: {
        error: true,
      },
      slots: {
        default: 'This is a banner message',
      },
    });
    expect(wrapper.text()).toBe('This is a banner message');
    expect(wrapper.element).toHaveStyle({ backgroundColor: 'rgb(255, 217, 211)' });
  });
});
