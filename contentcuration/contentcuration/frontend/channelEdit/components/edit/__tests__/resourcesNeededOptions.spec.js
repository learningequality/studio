import Vue from 'vue';
import Vuetify from 'vuetify';
import { shallowMount } from '@vue/test-utils';
import ResourcesNeededOptions, { exportedForTesting } from '../ResourcesNeededOptions.vue';
import { ResourcesNeededTypes } from 'shared/constants';

const { updateResourcesDropdown } = exportedForTesting;

Vue.use(Vuetify);

describe('ResourcesNeededOptions', () => {
  it('smoke test', () => {
    const wrapper = shallowMount(ResourcesNeededOptions);

    expect(wrapper.isVueInstance()).toBe(true);
  });

  it('when there is a list of keys to remove from ResourcesNeededTypes, return updated map for ResourcesNeededTypes for dropdown', () => {
    const list = ['FOR_BEGINNERS', 'INTERNET'];
    const numberOfAvailableResources = Object.keys(ResourcesNeededTypes).length - list.length;
    const dropdownItemsLength = Object.keys(updateResourcesDropdown(list)).length;

    expect(dropdownItemsLength).toBe(numberOfAvailableResources);
  });

  it('when there are no keys to remove from ResourcesNeededTypes, dropdown should contain all resources', () => {
    const list = [];
    const numberOfAvailableResources = Object.keys(ResourcesNeededTypes).length - list.length;
    const dropdownItemsLength = Object.keys(updateResourcesDropdown(list)).length;

    expect(dropdownItemsLength).toBe(numberOfAvailableResources);
  });

  it('emits expected data', () => {
    const wrapper = shallowMount(ResourcesNeededOptions);
    const value = 'test resource';
    wrapper.vm.$emit('input', value);

    expect(wrapper.emitted().input).toBeTruthy();
    expect(wrapper.emitted().input.length).toBe(1);
    expect(wrapper.emitted().input[0]).toEqual([value]);
  });
});
