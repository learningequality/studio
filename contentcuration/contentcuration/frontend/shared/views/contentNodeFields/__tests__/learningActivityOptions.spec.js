import { shallowMount, mount } from '@vue/test-utils';
import LearningActivityOptions from '../LearningActivityOptions.vue';
import { LearningActivities } from 'shared/constants';

function makeWrapper({ value = {}, nodeIds = ['node1'] } = {}) {
  return mount(LearningActivityOptions, {
    propsData: {
      value,
      nodeIds,
    },
  });
}

describe('LearningActivityOptions', () => {
  it('smoke test', () => {
    const wrapper = shallowMount(LearningActivityOptions);
    expect(wrapper.isVueInstance()).toBe(true);
  });

  it('number of items in the dropdown should be equal to number of items available in ', async () => {
    const wrapper = makeWrapper();
    await wrapper.find('.v-input__slot').trigger('click');

    const numberOfDropdownItems = Object.keys(LearningActivities).length;
    const dropdownItems = wrapper.find('.v-list').element.children.length;

    expect(dropdownItems).toBe(numberOfDropdownItems);
  });

  describe('updating state', () => {
    it('should update learning_activity field with new values received from a parent', () => {
      const learningActivity = {
        activity_1: ['node1'],
        activity_2: ['node1'],
      };
      const wrapper = makeWrapper({ value: learningActivity, nodeIds: ['node1'] });
      const dropdown = wrapper.find({ name: 'v-select' });

      expect(dropdown.props('value')).toEqual(['activity_1', 'activity_2']);

      wrapper.setProps({
        value: {
          activity_4: ['node1'],
        },
      });
      expect(dropdown.props('value')).toEqual(['activity_4']);
    });

    it('should emit new input values', () => {
      const learningActivity = ['activity_1', 'activity_2'];
      const wrapper = makeWrapper();
      const dropdown = wrapper.find({ name: 'v-select' });
      dropdown.vm.$emit('input', learningActivity);

      return dropdown.vm.$nextTick().then(() => {
        const emittedLevels = wrapper.emitted('input').pop()[0];
        expect(emittedLevels).toEqual({
          activity_1: ['node1'],
          activity_2: ['node1'],
        });
      });
    });
  });
});
