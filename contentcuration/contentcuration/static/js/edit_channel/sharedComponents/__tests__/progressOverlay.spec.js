import _ from 'underscore';
import Vue from 'vue';
import Vuetify from 'vuetify';
import { mount } from '@vue/test-utils';
import ProgressOverlay from '../ProgressOverlay.vue';
import ProgressBar from '../ProgressBar.vue';
import State from 'edit_channel/state';

Vue.use(Vuetify);

const task = { task: { id: 123, task_type: 'test-task' } };

function makeWrapper() {
  const store = State.Store;
  return mount(ProgressOverlay, {
    store: store,
  });
}

describe('progressOverlay', () => {
  let wrapper;
  beforeEach(() => {
    State.Store.commit('SET_CURRENT_TASK', task);
    State.Store.commit('SET_CURRENT_TASK_ERROR', null);
    wrapper = makeWrapper();
  });
  describe('on render', () => {
    it('status should be reflected in .status div', () => {
      function test(status) {
        wrapper.setData({ message: status });
        expect(wrapper.find('.status').text()).toEqual(status);
      }
      let statuses = ['good', 'bad', 'nice', "it's complicated"];
      _.each(statuses, test);
    });
    it('errors should be in .status-error div', () => {
      function test(error) {
        wrapper.setData({ errorText: error });
        expect(wrapper.find('.status-error').text()).toEqual(error);
        expect(wrapper.find('.failed').exists()).toBe(true);
      }
      expect(wrapper.find('.status-error').exists()).toBe(false);
      State.Store.commit('SET_CURRENT_TASK_ERROR', 'testing');
      let errors = ['comedy of errors', 'faux pas', 'translation error'];
      _.each(errors, test);
    });
    it('header text should match props data', () => {
      let header = 'Test Header';
      wrapper.setData({ headerText: header });
      expect(wrapper.find('.header').text()).toBe(header);
    });
    it('ProgressBar should be included', () => {
      expect(wrapper.find(ProgressBar)).toBeTruthy();
    });
    it('correct button should be displayed', () => {
      expect(wrapper.find('.cancel-button').exists()).toBe(true);
      expect(wrapper.find('.done-button').exists()).toBe(false);
      expect(wrapper.findAll(ProgressBar)).toBeTruthy();
      State.Store.commit('SET_PROGRESS', 100);
      expect(wrapper.find('.cancel-button').exists()).toBe(false);
      expect(wrapper.find('.done-button').exists()).toBe(true);
    });
  });

  describe('on button clicks', () => {
    it('DONE button should call closeOverlay', () => {
      State.Store.commit('SET_PROGRESS', 100);
      window.location.reload = jest.fn();
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
