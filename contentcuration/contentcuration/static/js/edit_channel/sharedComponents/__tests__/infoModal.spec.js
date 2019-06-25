import Vue from 'vue';
import Vuetify from 'vuetify';
import { mount } from '@vue/test-utils';
import InfoModal from '../InfoModal.vue';

Vue.use(Vuetify);

document.body.setAttribute('data-app', true); // Vuetify prints a warning without this

function makeWrapper(props = {}) {
  return mount(InfoModal, {
    attachToDocument: true,
    propsData: props,
    slots: {
      content: 'Test Content',
    },
  });
}

describe('infoModal', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper({ header: 'testHeader' });
  });
  it('header and content should be displayed on the dialog', () => {
    expect(wrapper.find('.v-dialog').text()).toContain('testHeader');
    expect(wrapper.find('.v-dialog').text()).toContain('Test Content');
  });
  it('clicking the info button should open the dialog', () => {
    expect(wrapper.find('.v-dialog').isVisible()).toBe(false);
    let button = wrapper.find('.v-btn');
    button.trigger('click');
    expect(wrapper.find('.v-dialog').isVisible()).toBe(true);
  });
  it('clicking the close button should close the dialog', () => {
    let button = wrapper.find('.v-btn');
    button.trigger('click');
    expect(wrapper.find('.v-dialog').isVisible()).toBe(true);

    let closeButton = wrapper.find('.v-card__actions .v-btn');
    closeButton.trigger('click');
    expect(wrapper.find('.v-dialog').isVisible()).toBe(false);
  });
});
