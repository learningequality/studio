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

  describe('on answers update', () => {
    it('emits update event with a correct payload', () => {
      const newAnswers = [
        { answer: 'Answer 1', correct: false, order: 1 },
        { answer: 'Answer 2', correct: true, order: 2 },
      ];

      wrapper.find({ name: 'AnswersEditor' }).vm.$emit('update', newAnswers);

      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0]).toEqual([
        { payload: { answers: newAnswers }, itemIdx: 1 },
      ]);
    });
  });

  describe('on hints update', () => {
    it('emits update event with a correct payload', () => {
      const newHints = [{ hint: 'Hint 1', order: 1 }, { hint: 'Hint 2', order: 2 }];

      wrapper.find({ name: 'HintsEditor' }).vm.$emit('update', newHints);

      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0]).toEqual([{ payload: { hints: newHints }, itemIdx: 1 }]);
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
