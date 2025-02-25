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
  it('smoke test', () => {
    const wrapper = shallowMount(LevelsOptions);

    expect(wrapper.isVueInstance()).toBe(true);
  });

  it('number of items in the dropdown should be equal to number of items available in ContentLevels', async () => {
    const wrapper = makeWrapper();
    await wrapper.find('.v-input__slot').trigger('click');

    const numberOfAvailableLevels = Object.keys(ContentLevels).length;
    const dropdownItems = wrapper.find('.v-list').element.children.length;

    expect(dropdownItems).toBe(numberOfAvailableLevels);
  });

  describe('updating state', () => {
    it('should update levels field with new values received from a parent', () => {
      const value = {
        abc: ['node1'],
        gefo: ['node1'],
      };
      const wrapper = makeWrapper({ value, nodeIds: ['node1'] });
      const dropdown = wrapper.find({ name: 'v-select' });

      expect(dropdown.props('value')).toEqual(['abc', 'gefo']);

      wrapper.setProps({
        value: {
          def: ['node1'],
        },
      });
      expect(dropdown.props('value')).toEqual(['def']);
    });

    it('should emit new input values', () => {
      const value = {
        abc: ['node1'],
      };
      const wrapper = makeWrapper({ value, nodeIds: ['node1'] });
      const dropdown = wrapper.find({ name: 'v-select' });
      dropdown.vm.$emit('input', ['abc', 'gefo']);

      return dropdown.vm.$nextTick().then(() => {
        const emittedLevels = wrapper.emitted('input').pop()[0];
        expect(emittedLevels).toEqual({
          abc: ['node1'],
          gefo: ['node1'],
        });
      });
    });
  });
});
