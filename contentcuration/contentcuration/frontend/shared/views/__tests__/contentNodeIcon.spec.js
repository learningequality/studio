import { mount } from '@vue/test-utils';
import ContentNodeIcon from '../ContentNodeIcon.vue';

function makeWrapper(kind) {
  return mount(ContentNodeIcon, {
    attachTo: document.body,
    propsData: {
      kind: kind,
    },
  });
}

describe('ContentNodeIcon', () => {
  const testIcons = [
    { value: 'topic', icon: 'folder' },
    { value: 'video', icon: 'ondemand_video' },
    { value: 'audio', icon: 'music_note' },
    { value: 'exercise', icon: 'assignment' },
    { value: 'document', icon: 'class' },
    { value: 'html5', icon: 'widgets' },
    { value: 'zim', icon: 'widgets' },
  ];

  it.each(testIcons)('should display the correct icon $value', kind => {
    const wrapper = makeWrapper(kind.value);
    expect(wrapper.findComponent('.v-icon').text()).toContain(kind.icon);
  });
});
