import _ from 'underscore';
import Vue from 'vue';
import Vuetify from 'vuetify';
import { mount } from '@vue/test-utils';
import HelpTooltip from '../HelpTooltip.vue';

Vue.use(Vuetify);

document.body.setAttribute('data-app', true); // Vuetify prints a warning without this

function makeWrapper(props = {}) {
  return mount(HelpTooltip, {
    attachToDocument: true,
    propsData: {
      text: 'text',
      ...props,
    },
  });
}

describe('helpTooltip', () => {
  it('should display text prop', () => {
    let wrapper = makeWrapper({ text: 'testText' });
    expect(wrapper.find('.v-tooltip__content').text()).toContain('testText');
  });
  it('should display the correct icon', () => {
    function test(icon) {
      let wrapper = makeWrapper({ icon: icon });
      expect(wrapper.find('.v-icon').text()).toEqual(icon);
    }
    _.each(['info', 'error', 'edit'], test);
  });
  it('should show the correct position', () => {
    function test(position) {
      let wrapper = makeWrapper({ position: position });
      expect(wrapper.findAll('.v-tooltip--' + position)).toHaveLength(1);
    }
    _.each(['top', 'bottom', 'left', 'right'], test);
  });
});
