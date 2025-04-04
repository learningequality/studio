import { shallowMount, mount } from '@vue/test-utils';
import LevelsOptions from '../LevelsOptions.vue';
import { ContentLevels } from 'shared/constants';

function makeWrapper({ value = {}, nodeIds = ['node1'] } = {}) {
  return mount(LevelsOptions, {
    propsData: {
      value,
      nodeIds,
    },
  });
}

describe('LevelsOptions', () => {
  it('smoke test', async () => {
    const wrapper = shallowMount(LevelsOptions);
    await wrapper.vm.$nextTick();
    expect(wrapper.exists()).toBe(true);
  });

  it('number of items in the dropdown should be equal to number of items available in ContentLevels', async () => {
    const wrapper = makeWrapper();
    await wrapper.findComponent('.v-input__slot').trigger('click');

    const numberOfAvailableLevels = Object.keys(ContentLevels).length;
    const dropdownItems = wrapper.findComponent({ name: 'v-list' }).element.children.length;

    expect(dropdownItems).toBe(numberOfAvailableLevels);
  });

  describe('updating state', () => {
    it('should update levels field with new values received from a parent', async () => {
      const value = {
        abc: ['node1'],
        gefo: ['node1'],
      };
      const wrapper = makeWrapper({ value, nodeIds: ['node1'] });
      const dropdown = wrapper.findComponent({ name: 'v-select' });

      expect(dropdown.props('value')).toEqual(['abc', 'gefo']);

      wrapper.setProps({
        value: {
          def: ['node1'],
        },
      });
      await wrapper.vm.$nextTick();
      expect(dropdown.props('value')).toEqual(['def']);
    });

    it('should emit new input values', async () => {
      const value = {
        abc: ['node1'],
      };
      const wrapper = makeWrapper({ value, nodeIds: ['node1'] });
      const dropdown = wrapper.findComponent({ name: 'v-select' });
      dropdown.vm.$emit('input', ['abc', 'gefo']);

      await wrapper.vm.$nextTick();

      const emittedLevels = wrapper.emitted('input').pop()[0];
      expect(emittedLevels).toEqual({
        abc: ['node1'],
        gefo: ['node1'],
      });
    });
  });
});
