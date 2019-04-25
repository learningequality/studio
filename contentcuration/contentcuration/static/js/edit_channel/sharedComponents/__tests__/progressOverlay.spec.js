import Vue from 'vue';
import Vuetify from 'vuetify';
import { mount } from '@vue/test-utils';
import ProgressOverlay from '../ProgressOverlay.vue';
import ProgressBar from '../ProgressBar.vue';

Vue.use(Vuetify);

function makeWrapper(props = {}) {
  return mount(ProgressOverlay, {
    propsData: {
      headerText: 'test',
      taskID: 'test',
      ...props,
    },
  });
}

describe('progressOverlay', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  describe('on render', () => {
    it('header text should match props data', () => {
      let header = 'Test Header';
      wrapper = makeWrapper({ headerText: header });
      expect(wrapper.find('.header').text()).toBe(header);
    });
    it('ProgressBar should be included', () => {
      expect(wrapper.find(ProgressBar)).toBeTruthy();
    });
    it('correct button should be displayed', () => {
      expect(wrapper.find('.cancel-button').exists()).toBe(true);
      expect(wrapper.find('.done-button').exists()).toBe(false);
      expect(wrapper.findAll(ProgressBar)).toBeTruthy();
      wrapper.setData({ done: true });
      expect(wrapper.find('.cancel-button').exists()).toBe(false);
      expect(wrapper.find('.done-button').exists()).toBe(true);
    });
  });

  describe('on button clicks', () => {
    it('DONE button should call closeOverlay', () => {
      window.location.reload = jest.fn();
      wrapper.setData({ done: true });
      wrapper.find('.done-button').trigger('click');
      expect(window.location.reload).toBeCalled();
    });
    it('CANCEL button should open dialog', () => {
      wrapper.find('.cancel-button').trigger('click');
      expect(document.querySelector('#dialog-box')).toBeTruthy();
    });
  });

  describe('on progress bar emitted events', () => {
    let progressBar;
    beforeEach(() => {
      progressBar = wrapper.find(ProgressBar);
    });
    it('finished should trigger done to be marked as true', () => {
      expect(wrapper.vm.done).toBe(false);
      progressBar.vm.$emit('finished');
      expect(wrapper.vm.done).toBe(true);
    });
    it('cancelled should trigger handleCancelled', () => {
      window.location.reload = jest.fn();
      progressBar.vm.$emit('cancelled');
      expect(window.location.reload).toBeCalled();
    });
    it('failed should trigger failed to be marked as true', () => {
      expect(wrapper.vm.failed).toBe(false);
      progressBar.vm.$emit('failed');
      expect(wrapper.vm.failed).toBe(true);
    });
  });
});
