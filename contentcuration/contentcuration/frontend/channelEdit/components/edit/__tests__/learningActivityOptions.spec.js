import Vue from 'vue';
import Vuetify from 'vuetify';
import { shallowMount } from '@vue/test-utils';
import LearningActivityOptions from '../LearningActivityOptions.vue';
import { LearningActivities } from 'shared/constants';

Vue.use(Vuetify);

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
});
