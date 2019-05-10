import _ from 'underscore';
import Vue from 'vue';
import Vuetify from 'vuetify';
import { mount } from '@vue/test-utils';
import ProgressBar from '../ProgressBar.vue';
import State from 'edit_channel/state';

Vue.use(Vuetify);

const percents = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

function makeWrapper(props = {}) {
  const store = State.Store;
  return mount(ProgressBar, {
    store: store,
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
    it('percentage should be in .percentage div', () => {
      function test(percent) {
        State.Store.commit('SET_PROGRESS', percent);
        expect(wrapper.vm.progressPercent).toEqual(percent);
        expect(wrapper.find('.percentage').text()).toContain(percent);
      }
      expect(wrapper.find('.percentage').exists()).toBe(false);
      _.each(percents, test);
    });

    it('width of progress bar should be updated when progress is updated', () => {
      function test(percent) {
        State.Store.commit('SET_PROGRESS', percent);
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
});
