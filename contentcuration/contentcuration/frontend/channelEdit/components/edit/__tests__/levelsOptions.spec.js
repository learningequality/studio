import Vue from 'vue';
import Vuetify from 'vuetify';
import { shallowMount } from '@vue/test-utils';
import LevelsOptions from '../LevelsOptions.vue';
import { ContentLevels } from 'shared/constants';

Vue.use(Vuetify);

describe('LevelsOptions', () => {
  it('smoke test', () => {
    const wrapper = shallowMount(LevelsOptions);

    expect(wrapper.isVueInstance()).toBe(true);
  });

  it('number of items in the dropdown should be equal to number of items available in ContentLevels', () => {
    const wrapper = shallowMount(LevelsOptions);
    const numberOfAvailableLevels = Object.keys(ContentLevels).length;
    const dropdownItems = wrapper.attributes()['items'].split(',').length;

    expect(dropdownItems).toBe(numberOfAvailableLevels);
  });
});
