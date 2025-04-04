import { shallowMount } from '@vue/test-utils';
import CategoryOptions from '../CategoryOptions.vue';

function makeWrapper({ value = {}, nodeIds = ['node1'] } = {}) {
  return shallowMount(CategoryOptions, {
    propsData: {
      value,
      nodeIds,
    },
  });
}

describe('CategoryOptions', () => {
  it('smoke test', () => {
    const wrapper = makeWrapper();
    expect(wrapper.exists()).toBe(true);
  });

  it('emits expected data', () => {
    const wrapper = makeWrapper();
    const value = 'string';
    wrapper.vm.$emit('input', value);

    expect(wrapper.emitted().input).toBeTruthy();
    expect(wrapper.emitted().input.length).toBe(1);
    expect(wrapper.emitted().input[0]).toEqual([value]);
  });

  describe('display', () => {
    it('has a tooltip that displays the tree for value of an item', () => {
      const wrapper = makeWrapper();
      const item = 'd&WXdXWF.5QAjgfv7.BUMJJBnS'; // 'Dance'
      const expectedToolTip = 'School - Arts - Dance';

      expect(wrapper.vm.tooltipText(item)).toEqual(expectedToolTip);
    });
    it(`dropdown has 'levels' key necessary to display the nested structure of categories`, () => {
      const wrapper = makeWrapper();
      const dropdown = wrapper.vm.categoriesList;
      const everyCategoryHasLevelsKey = dropdown.every(item => 'level' in item);

      expect(everyCategoryHasLevelsKey).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('when user checks an item, that is emitted to the parent component', () => {
      const wrapper = makeWrapper();
      const item = 'abcd';
      wrapper.vm.$emit = jest.fn();
      wrapper.vm.add(item);

      expect(wrapper.vm.$emit.mock.calls[0][0]).toBe('input');
      expect(wrapper.vm.$emit.mock.calls[0][1]).toEqual({ abcd: ['node1'] });
    });
    it('when user unchecks an item, that is emitted to the parent component', () => {
      const wrapper = makeWrapper();
      const item = 'defj';
      wrapper.vm.$emit = jest.fn();
      wrapper.vm.remove(item);

      expect(wrapper.vm.$emit.mock.calls[0][0]).toBe('input');
      expect(wrapper.vm.$emit.mock.calls[0][1]).toEqual({});
    });
  });

  describe('close button on chip interactions', () => {
    it('in the autocomplete bar, the chip is removed when user clicks on its close button', async () => {
      const wrapper = makeWrapper({
        value: {
          'remove me': ['node1'],
          'keep me': ['node1'],
        },
      });
      const originalChipsLength = Object.keys(wrapper.vm.selected).length;
      wrapper.vm.remove('remove me');

      expect(wrapper.emitted().input.length).toEqual(originalChipsLength - 1);
    });
  });
});
