import Vue from 'vue';
import Vuetify from 'vuetify';
import { shallowMount, mount } from '@vue/test-utils';
import LearningActivityOptions from '../LearningActivityOptions.vue';
import { LearningActivities } from 'shared/constants';

Vue.use(Vuetify);

function makeWrapper(value) {
  return mount(LearningActivityOptions, {
    propsData: {
      value,
    },
  });
}

describe('LearningActivityOptions', () => {
  it('smoke test', () => {
    const wrapper = shallowMount(LearningActivityOptions);
    expect(wrapper.isVueInstance()).toBe(true);
  });

  it('number of items in the dropdown should be equal to number of items available in ', () => {
    const wrapper = shallowMount(LearningActivityOptions);
    const numberOfDropdownItems = Object.keys(LearningActivities).length;
    const dropdownItems = wrapper.attributes()['items'].split(',').length;

    expect(dropdownItems).toBe(numberOfDropdownItems);
  });

  describe('updating state', () => {
    it('should update learning_activity field with new values received from a parent', () => {
      const learningActivity = ['activity_1', 'activity_2'];
      const wrapper = makeWrapper(learningActivity);
      const dropdown = wrapper.find({ name: 'v-select' });

      expect(dropdown.props('value')).toEqual(learningActivity);

      wrapper.setProps({
        value: ['activity_4'],
      });
      expect(dropdown.props('value')).toEqual(['activity_4']);
    });

    it('should emit new input values', () => {
      const learningActivity = ['activity_1', 'activity_2', 'activity_3'];
      const wrapper = makeWrapper({});
      const dropdown = wrapper.find({ name: 'v-select' });
      dropdown.vm.$emit('input', learningActivity);

      return Vue.nextTick().then(() => {
        const emittedLevels = wrapper.emitted('input').pop()[0];
        expect(emittedLevels).toEqual(learningActivity);
      });
    });
  });
});
