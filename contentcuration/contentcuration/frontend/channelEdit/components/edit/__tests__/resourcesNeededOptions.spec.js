import Vue from 'vue';
import Vuetify from 'vuetify';
import { shallowMount, mount } from '@vue/test-utils';
import ResourcesNeededOptions from '../ResourcesNeededOptions.vue';

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
      const wrapper = makeWrapper([]);
      const dropdown = wrapper.find({ name: 'v-select' });
      dropdown.vm.$emit('input', resourcesNeeded);

      return Vue.nextTick().then(() => {
        const emittedLevels = wrapper.emitted('input').pop()[0];
        expect(emittedLevels).toEqual(resourcesNeeded);
      });
    });
  });
});
