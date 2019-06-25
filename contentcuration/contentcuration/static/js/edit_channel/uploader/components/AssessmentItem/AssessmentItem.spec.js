import { shallowMount, mount } from '@vue/test-utils';

import { AssessmentItemTypes } from '../../constants';
import AssessmentItem from './AssessmentItem';

const ITEM = {
  question: 'What color is the sky?',
  type: AssessmentItemTypes.SINGLE_SELECTION,
  order: 1,
  answers: [
    { answer: 'Yellow', correct: false, order: 1 },
    { answer: 'Black', correct: false, order: 2 },
    { answer: 'Blue', correct: true, order: 3 },
  ],
  hints: [{ hint: 'First hint', order: 1 }, { hint: 'Second hint', order: 2 }],
};

const clickCloseBtn = wrapper => {
  wrapper.find('[data-test=closeBtn]').trigger('click');
};

const selectKind = (wrapper, kind) => {
  const input = wrapper.find('[data-test=kindSelect]');
  input.element.value = kind;

  input.trigger('input');
};

const updateQuestion = (wrapper, newQuestion) => {
  wrapper.find('[data-test=questionInput]').setValue(newQuestion);
};

describe('AssessmentItem', () => {
  let wrapper;

  it('smoke test', () => {
    const wrapper = shallowMount(AssessmentItem);

    expect(wrapper.isVueInstance()).toBe(true);
  });

  describe('when closed', () => {
    beforeEach(() => {
      wrapper = mount(AssessmentItem, {
        propsData: {
          item: ITEM,
          itemIdx: 1,
          isOpen: false,
        },
      });
    });

    it('renders', () => {
      expect(wrapper.html()).toMatchSnapshot();
    });
  });

  describe('when open', () => {
    beforeEach(() => {
      wrapper = mount(AssessmentItem, {
        propsData: {
          item: ITEM,
          itemIdx: 1,
          isOpen: true,
        },
      });
    });

    it('renders', () => {
      expect(wrapper.html()).toMatchSnapshot();
    });

    describe('on item type update', () => {
      it('emits update event with a correct payload', () => {
        selectKind(wrapper, AssessmentItemTypes.MULTIPLE_SELECTION);

        expect(wrapper.emitted().update).toBeTruthy();
        expect(wrapper.emitted().update.length).toBe(1);
        expect(wrapper.emitted().update[0]).toEqual([
          {
            payload: {
              type: AssessmentItemTypes.MULTIPLE_SELECTION,
              answers: [
                { answer: 'Yellow', correct: false, order: 1 },
                { answer: 'Black', correct: false, order: 2 },
                { answer: 'Blue', correct: true, order: 3 },
              ],
            },
            itemIdx: 1,
          },
        ]);
      });
    });

    describe('on question update', () => {
      it('emits update event with a correct payload', () => {
        updateQuestion(wrapper, 'What color is your eyes?');

        expect(wrapper.emitted().update).toBeTruthy();
        expect(wrapper.emitted().update.length).toBe(1);
        expect(wrapper.emitted().update[0]).toEqual([
          { payload: { question: 'What color is your eyes?' }, itemIdx: 1 },
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
  });

  describe('on close click', () => {
    it('emits close event', () => {
      clickCloseBtn(wrapper);

      expect(wrapper.emitted().close).toBeTruthy();
      expect(wrapper.emitted().close.length).toBe(1);
    });
  });
});
