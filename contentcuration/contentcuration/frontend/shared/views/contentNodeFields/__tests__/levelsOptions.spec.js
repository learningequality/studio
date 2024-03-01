import Vue from 'vue';
import Vuetify from 'vuetify';
import { shallowMount, mount } from '@vue/test-utils';
import LevelsOptions from '../LevelsOptions.vue';
import { ContentLevels } from 'shared/constants';

Vue.use(Vuetify);

function makeWrapper(value) {
  return mount(LevelsOptions, {
    propsData: {
      value,
    },
  });
}

describe('LevelsOptions', () => {
  it('smoke test', () => {
    const wrapper = shallowMount(LevelsOptions);

    expect(wrapper.isVueInstance()).toBe(true);
  });

  it('number of items in the dropdown should be equal to number of items available in ContentLevels', async () => {
    const wrapper = makeWrapper([]);
    await wrapper.find('.v-input__slot').trigger('click');

    const numberOfAvailableLevels = Object.keys(ContentLevels).length;
    const dropdownItems = wrapper.find('.v-list').element.children.length;

    expect(dropdownItems).toBe(numberOfAvailableLevels);
  });

  describe('updating state', () => {
    it('should update levels field with new values received from a parent', () => {
      const levels = ['abc', 'gefo'];
      const wrapper = makeWrapper(levels);
      const dropdown = wrapper.find({ name: 'v-select' });

      expect(dropdown.props('value')).toEqual(levels);

      wrapper.setProps({
        value: ['def'],
      });
      expect(dropdown.props('value')).toEqual(['def']);
    });

    it('should emit new input values', () => {
      const levels = ['abc', 'gefo', '8hw'];
      const wrapper = makeWrapper({});
      const dropdown = wrapper.find({ name: 'v-select' });
      dropdown.vm.$emit('input', levels);

      return Vue.nextTick().then(() => {
        const emittedLevels = wrapper.emitted('input').pop()[0];
        expect(emittedLevels).toEqual(levels);
      });
    });
  });
});
