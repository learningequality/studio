import Vue from 'vue';
import Vuetify from 'vuetify';
import { mount } from '@vue/test-utils';
import ContentNodeIcon from '../ContentNodeIcon.vue';

Vue.use(Vuetify);

document.body.setAttribute('data-app', true); // Vuetify prints a warning without this

function makeWrapper(kind) {
  return mount(ContentNodeIcon, {
    attachToDocument: true,
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
  ];
  it.each(testIcons)('should display the correct icon $value', kind => {
    const wrapper = makeWrapper(kind.value);
    expect(wrapper.find('.v-icon').text()).toContain(kind.icon);
  });
});
