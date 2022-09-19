import Vue from 'vue';
import Vuetify from 'vuetify';
import { shallowMount, mount } from '@vue/test-utils';
import ResourcesNeededOptions, { updateResourcesDropdown } from '../ResourcesNeededOptions.vue';
import { ResourcesNeededTypes } from 'shared/constants';

Vue.use(Vuetify);

function makeWrapper(value) {
  return mount(ResourcesNeededOptions, {
    propsData: {
      value,
    },
  });
}

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

  describe('updating state', () => {
    it('should update resources field with new values received from a parent', () => {
      const resourcesNeeded = ['person', 'book'];
      const wrapper = makeWrapper(resourcesNeeded);
      const dropdown = wrapper.find({ name: 'v-select' });

      expect(dropdown.props('value')).toEqual(resourcesNeeded);

      wrapper.setProps({
        value: ['cat'],
      });
      expect(dropdown.props('value')).toEqual(['cat']);
    });

    it('should emit new input values', () => {
      const resourcesNeeded = ['person', 'book', 'train'];
      const wrapper = makeWrapper({});
      const dropdown = wrapper.find({ name: 'v-select' });
      dropdown.vm.$emit('input', resourcesNeeded);

      return Vue.nextTick().then(() => {
        const emittedLevels = wrapper.emitted('input').pop()[0];
        expect(emittedLevels).toEqual(resourcesNeeded);
      });
    });
  });
});
