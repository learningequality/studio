import { shallowMount, mount } from '@vue/test-utils';

import { AssessmentItemTypes } from '../../constants';
import AssessmentItem from './AssessmentItem';

const clickCloseBtn = wrapper => {
  wrapper.find('[data-test=closeBtn]').trigger('click');
};

const selectKind = (wrapper, kind) => {
  const input = wrapper.find('[data-test=kindSelect]');
  input.element.value = kind;

  input.trigger('input');
};

describe('AssessmentItem', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(AssessmentItem, {
      propsData: {
        item: {
          question: 'What color is the sky?',
          type: AssessmentItemTypes.SINGLE_SELECTION,
        },
        itemIdx: 1,
        isOpen: true,
      },
    });
  });

  it('smoke test', () => {
    const wrapper = shallowMount(AssessmentItem);

    expect(wrapper.isVueInstance()).toBe(true);
  });

  describe('on item type update', () => {
    it('emits update event with a correct payload', () => {
      selectKind(wrapper, AssessmentItemTypes.MULTIPLE_SELECTION);

      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0]).toEqual([
        { payload: { type: AssessmentItemTypes.MULTIPLE_SELECTION }, itemIdx: 1 },
      ]);
    });
  });

  describe('on close click', () => {
    it('emits close event', () => {
      clickCloseBtn(wrapper);

      expect(wrapper.emitted().close).toBeTruthy();
      expect(wrapper.emitted().close.length).toBe(1);
    });
  });
});
