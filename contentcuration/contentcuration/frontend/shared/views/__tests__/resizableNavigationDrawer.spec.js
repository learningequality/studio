import { mount } from '@vue/test-utils';
import ResizableNavigationDrawer from '../ResizableNavigationDrawer';

function makeWrapper(props = {}) {
  return mount(ResizableNavigationDrawer, props);
}

describe('resizableNavigationDrawer', () => {
  it('slot should render content', () => {
    const wrapper = makeWrapper({
      slots: {
        default: 'test content',
      },
    });
    expect(wrapper.find('.drawer-contents').text()).toBe('test content');
  });
});
