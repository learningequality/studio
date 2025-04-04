import { mount } from '@vue/test-utils';
import VIconWrapper from '../VIconWrapper.vue';

function makeWrapper(options) {
  return mount(VIconWrapper, options);
}

describe('appIcon', () => {
  it('should have the `notranslate` CSS class', () => {
    const wrapper = makeWrapper({});
    const icon = wrapper.findComponent({ name: 'v-icon' });
    expect(icon.classes('notranslate')).toEqual(true);
  });

  it('should set the icon properly from the slot', () => {
    const wrapper = makeWrapper({
      context: {
        children: ['circle'],
      },
    });
    const icon = wrapper.findComponent({ name: 'v-icon' });
    expect(icon.text()).toEqual('circle');
  });

  it('should set the icon properly from the prop', () => {
    const wrapper = makeWrapper({
      context: {
        props: {
          iconName: 'circle',
        },
      },
    });
    const icon = wrapper.findComponent({ name: 'v-icon' });
    expect(icon.text()).toEqual('circle');
  });
});
