import _ from 'underscore';
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
  it('should display the correct icon', () => {
    function test(kind) {
      let wrapper = makeWrapper(kind.value);
      expect(wrapper.find('.v-icon').text()).toContain(kind.icon);
    }
    let testIcons = [
      { value: 'topic', icon: 'folder' },
      { value: 'video', icon: 'ondemand_video' },
      { value: 'audio', icon: 'music_note' },
      { value: 'exercise', icon: 'assignment' },
      { value: 'document', icon: 'class' },
      { value: 'html5', icon: 'widgets' },
    ];
    _.each(testIcons, test);
  });
});
