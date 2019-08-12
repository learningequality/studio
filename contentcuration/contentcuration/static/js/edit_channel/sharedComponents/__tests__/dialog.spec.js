import Vue from 'vue';
import Vuetify from 'vuetify';
import { mount } from '@vue/test-utils';
import Dialog from '../Dialog.vue';

Vue.use(Vuetify);

document.body.setAttribute('data-app', true); // Vuetify prints a warning without this

function makeWrapper(props = {}) {
  return mount(Dialog, {
    attachToDocument: true,
    propsData: props,
  });
}

describe('dialog', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper({ header: 'testHeader', text: 'testText' });
  });
  it('header and text should be displayed on the dialog', () => {
    expect(wrapper.find('.v-dialog').text()).toContain('testHeader');
    expect(wrapper.find('.v-dialog').text()).toContain('testText');
  });
  it('prompt should open the dialog', () => {
    expect(wrapper.find('.v-dialog').isVisible()).toBe(false);
    wrapper.vm.prompt();
    expect(wrapper.find('.v-dialog').isVisible()).toBe(true);
  });
  it('close should close the dialog', () => {
    wrapper.vm.prompt();
    expect(wrapper.find('.v-dialog').isVisible()).toBe(true);
    wrapper.vm.close();
    expect(wrapper.find('.v-dialog').isVisible()).toBe(false);
  });
});
