import { mount } from '@vue/test-utils';
import ResourcesNeededOptions from '../ResourcesNeededOptions.vue';

function makeWrapper({ value = {}, nodeIds = ['node1'] } = {}) {
  return mount(ResourcesNeededOptions, {
    propsData: {
      value,
      nodeIds,
    },
  });
}

describe('ResourcesNeededOptions', () => {
  it('smoke test', () => {
    const wrapper = makeWrapper();

    expect(wrapper.isVueInstance()).toBe(true);
  });

  describe('updating state', () => {
    it('should update resources field with new values received from a parent', () => {
      const value = {
        person: ['node1'],
        book: ['node1'],
      };
      const wrapper = makeWrapper({ value, nodeIds: ['node1'] });
      const dropdown = wrapper.find({ name: 'v-select' });

      expect(dropdown.props('value')).toEqual(['person', 'book']);

      wrapper.setProps({
        value: {
          train: ['node1'],
        },
      });
      expect(dropdown.props('value')).toEqual(['train']);
    });

    it('should emit new input values', async () => {
      const resourcesNeeded = {
        person: ['node1'],
      };
      const wrapper = makeWrapper({ value: resourcesNeeded, nodeIds: ['node1'] });
      const dropdown = wrapper.find({ name: 'v-select' });
      dropdown.vm.$emit('input', ['person', 'book']);

      await wrapper.vm.$nextTick();

      const emittedLevels = wrapper.emitted('input').pop()[0];
      expect(emittedLevels).toEqual({
        person: ['node1'],
        book: ['node1'],
      });
    });
  });
});
