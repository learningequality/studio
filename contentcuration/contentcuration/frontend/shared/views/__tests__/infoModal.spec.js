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
  it('clicking the info button should open the dialog', () => {
    expect(wrapper.find('.v-dialog').isVisible()).toBe(false);
    let button = wrapper.find('.v-icon');
    button.trigger('click');
    expect(wrapper.find('.v-dialog').isVisible()).toBe(true);
  });
  it('clicking the close button should close the dialog', () => {
    let button = wrapper.find('.v-icon');
    button.trigger('click');
    expect(wrapper.find('.v-dialog').isVisible()).toBe(true);

    let closeButton = wrapper.find('.v-card__actions .v-btn');
    closeButton.trigger('click');
    expect(wrapper.find('.v-dialog').isVisible()).toBe(false);
  });
});
