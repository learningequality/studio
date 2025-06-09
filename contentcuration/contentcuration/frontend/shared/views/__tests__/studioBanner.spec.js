import { mount } from '@vue/test-utils';
import StudioBanner from '../StudioBanner.vue';

function makeWrapper(props = {}, slots = {}) {
  return mount(StudioBanner, {
    attachTo: document.body,
    propsData: {
      show: true, // default to visible
      text: '',
      error: false,
      ...props,
    },
    slots,
  });
}

describe('StudioBanner', () => {
  let wrapper;

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy();
    }
  });

  it('renders when show is true', () => {
    wrapper = makeWrapper({ show: true, text: 'Test text' });
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.isVisible()).toBe(true);
    expect(wrapper.text()).toContain('Test text');
  });

  it('does not render when show is false', () => {
    wrapper = makeWrapper({ show: false, text: 'Should not show' });
    expect(wrapper.html()).toBe('');
  });

  it('renders slot content over text prop', () => {
    wrapper = makeWrapper({ show: true, text: 'Fallback text' }, { default: 'Slot content here' });
    expect(wrapper.text()).toBe('Slot content here');
  });

  it('has role alert for accessibility', () => {
    wrapper = makeWrapper({ show: true });
    expect(wrapper.attributes('role')).toBe('alert');
  });

  it('accepts the error prop without affecting output', () => {
    wrapper = makeWrapper({ show: true, error: true, text: 'Error banner' });
    expect(wrapper.text()).toContain('Error banner');
    expect(wrapper.attributes('role')).toBe('alert');
  });
});
