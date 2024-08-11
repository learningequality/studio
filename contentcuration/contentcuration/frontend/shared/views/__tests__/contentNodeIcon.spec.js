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
    { value: 'topic', icon: 'topic' },
    { value: 'video', icon: 'video' },
    { value: 'audio', icon: 'audio' },
    { value: 'exercise', icon: 'exercise' },
    { value: 'document', icon: 'document' },
    { value: 'html5', icon: 'html5' },
    { value: 'zim', icon: 'html5' },
  ];
  it.each(testIcons)('should pass the correct icon value to KIcon', kind => {
    const wrapper = makeWrapper(kind.value);
    expect(wrapper.find('[data-test="icon"]').props().icon).toBe(kind.icon);
  });
});
