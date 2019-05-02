import _ from 'underscore';
import Vue from 'vue';
import Vuetify from 'vuetify';
import { mount } from '@vue/test-utils';
import ProgressBar from '../ProgressBar.vue';

Vue.use(Vuetify);

const percents = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

function makeWrapper(props = {}) {
  return mount(ProgressBar, {
    propsData: {
      headerText: 'test',
      taskID: 'test',
      ...props,
    },
  });
}

describe('progressBar', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  describe('computed properties', () => {
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
        wrapper.setData({ error: error });
        expect(wrapper.find('.status-error').text()).toEqual(error);
        expect(wrapper.find('.failed').exists()).toBe(true);
      }
      expect(wrapper.find('.status-error').exists()).toBe(false);
      let errors = ['comedy of errors', 'faux pas', 'translation error'];
      _.each(errors, test);
    });
    it('percentage should be in .percentage div', () => {
      function test(percent) {
        wrapper.setData({ percent: percent });
        expect(wrapper.find('.percentage').text()).toContain(percent);
      }
      expect(wrapper.find('.percentage').exists()).toBe(false);
      _.each(percents, test);
    });

    it('width of progress bar should be updated when progress is updated', () => {
      function test(percent) {
        wrapper.setData({ percent: percent });
        let progressBar = wrapper.find('.v-progress-linear__bar div');
        let testString = 'width: ' + percent + '%;';
        expect(progressBar.attributes('style')).toContain(testString);
        if (percent === 100) {
          expect(wrapper.find('.finished').exists()).toBe(true);
          expect(wrapper.vm.isDone).toBe(true);
        }
      }
      _.each(percents, test);
    });
  });

  describe('emitted events', () => {
    it('failed should be called on updateProgress', () => {
      expect(wrapper.emitted().failed).toBeFalsy();
      wrapper.vm.updateProgress({ error: 'error' });
      expect(wrapper.emitted().failed).toBeTruthy();
    });
    it('finished should be called on updateProgress with percent at 100', () => {
      expect(wrapper.emitted().finished).toBeFalsy();
      wrapper.vm.updateProgress({ message: 'hello', percent: 100 });
      expect(wrapper.emitted().finished).toBeTruthy();
    });
    it('cancelled should be called on cancelTask', () => {
      expect(wrapper.emitted().cancelled).toBeFalsy();
      wrapper.vm.cancelTask();
      wrapper.vm.$nextTick(() => {
        // TODO: wait for actual progress API
        // expect(wrapper.emitted().cancelled).toBeTruthy();
        // expect(mockCancelTask).toHaveBeenCalled();
      });
    });
  });

  it('checkProgress should call checkProgress vuex action', () => {
    // TODO: wait for actual progress API
    // expect(mockCheckProgress).toHaveBeenCalled();
  });
});
