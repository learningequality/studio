import { shallowMount, mount } from '@vue/test-utils';

import { AssessmentItemToolbarActions } from '../../constants';
import AnswersEditor from './AnswersEditor';
import { AssessmentItemTypes } from 'shared/constants';

jest.mock('shared/views/MarkdownEditor/MarkdownEditor/MarkdownEditor.vue');
jest.mock('shared/views/MarkdownEditor/MarkdownViewer/MarkdownViewer.vue');

const clickNewAnswerBtn = wrapper => {
  wrapper.find('[data-test="newAnswerBtn"]').find('button').trigger('click');
};

const rendersNewAnswerBtn = wrapper => {
  return wrapper.contains('[data-test="newAnswerBtn"]');
};

const clickAnswer = (wrapper, answerIdx) => {
  wrapper.findAll('[data-test="answer"]').at(answerIdx).trigger('click');
};

const clickMoveAnswerUp = (wrapper, answerIdx) => {
  wrapper
    .findAll(`[data-test="toolbarIcon-${AssessmentItemToolbarActions.MOVE_ITEM_UP}"]`)
    .at(answerIdx)
    .trigger('click');
};

const clickMoveAnswerDown = (wrapper, answerIdx) => {
  wrapper
    .findAll(`[data-test="toolbarIcon-${AssessmentItemToolbarActions.MOVE_ITEM_DOWN}"]`)
    .at(answerIdx)
    .trigger('click');
};

const clickDeleteAnswer = (wrapper, answerIdx) => {
  wrapper
    .findAll(`[data-test="toolbarIcon-${AssessmentItemToolbarActions.DELETE_ITEM}"]`)
    .at(answerIdx)
    .trigger('click');
};

describe('AnswersEditor', () => {
  let wrapper;

  it('smoke test', () => {
    const wrapper = shallowMount(AnswersEditor);

    expect(wrapper.isVueInstance()).toBe(true);
  });

  it('renders a placeholder when there are no answers', () => {
    wrapper = mount(AnswersEditor, {
      propsData: {
        answers: [],
      },
    });

    expect(wrapper.html()).toContain('Question has no answer options');
  });

  describe('for a single selection question', () => {
    beforeEach(() => {
      wrapper = mount(AnswersEditor, {
        propsData: {
          questionKind: AssessmentItemTypes.SINGLE_SELECTION,
          answers: [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: false, order: 2 },
          ],
        },
      });
    });

    it('renders answers as radio selects', () => {
      const inputs = wrapper.findAll('input');

      expect(inputs.length).toBe(2);
      for (const n in [0, 1]) {
        expect(inputs.at(n).attributes()['type']).toBe('radio');
      }
    });

    it('renders only correct answers as checked', () => {
      const inputs = wrapper.findAll('input');

      expect(inputs.at(0).element.checked).toBe(true);
      expect(inputs.at(1).element.checked).toBe(false);
    });

    it('renders new answer button', () => {
      expect(rendersNewAnswerBtn(wrapper)).toBe(true);
    });

    describe('on new answer button click', () => {
      beforeEach(() => {
        clickNewAnswerBtn(wrapper);
      });

      it('emits update event with a payload containing all answers + new answer which is wrong by default', () => {
        expect(wrapper.emitted().update).toBeTruthy();
        expect(wrapper.emitted().update.length).toBe(1);
        expect(wrapper.emitted().update[0][0]).toEqual([
          { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
          { answer: 'Peanut butter', correct: false, order: 2 },
          { answer: '', correct: false, order: 3 },
        ]);
      });
    });
  });

  describe('for a multiple selection question', () => {
    beforeEach(() => {
      wrapper = mount(AnswersEditor, {
        propsData: {
          questionKind: AssessmentItemTypes.MULTIPLE_SELECTION,
          answers: [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: false, order: 2 },
            { answer: 'Jelly', correct: true, order: 3 },
          ],
        },
      });
    });

    it('renders answers as checkboxes', () => {
      const inputs = wrapper.findAll('input');

      expect(inputs.length).toBe(3);
      for (const n in [0, 1, 2]) {
        expect(inputs.at(n).attributes()['type']).toBe('checkbox');
      }
    });

    it('renders only correct answers as checked', () => {
      const inputs = wrapper.findAll('input');

      expect(inputs.at(0).element.checked).toBe(true);
      expect(inputs.at(1).element.checked).toBe(false);
      expect(inputs.at(2).element.checked).toBe(true);
    });

    it('renders new answer button', () => {
      expect(rendersNewAnswerBtn(wrapper)).toBe(true);
    });

    describe('on new answer button click', () => {
      beforeEach(() => {
        clickNewAnswerBtn(wrapper);
      });

      it('emits update event with a payload containing all answers + new answer which is wrong by default', () => {
        expect(wrapper.emitted().update).toBeTruthy();
        expect(wrapper.emitted().update.length).toBe(1);
        expect(wrapper.emitted().update[0][0]).toEqual([
          { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
          { answer: 'Peanut butter', correct: false, order: 2 },
          { answer: 'Jelly', correct: true, order: 3 },
          { answer: '', correct: false, order: 4 },
        ]);
      });
    });
  });

  describe('for a true/false question', () => {
    beforeEach(() => {
      wrapper = mount(AnswersEditor, {
        propsData: {
          questionKind: AssessmentItemTypes.TRUE_FALSE,
          answers: [
            { answer: 'True', correct: false, order: 1 },
            { answer: 'False', correct: true, order: 2 },
          ],
        },
      });
    });

    it('renders answers as radio selects', () => {
      const inputs = wrapper.findAll('input');

      expect(inputs.length).toBe(2);
      for (const n in [0, 1]) {
        expect(inputs.at(n).attributes()['type']).toBe('radio');
      }
    });

    it('renders only correct answers as checked', () => {
      const inputs = wrapper.findAll('input');

      expect(inputs.at(0).element.checked).toBe(false);
      expect(inputs.at(1).element.checked).toBe(true);
    });

    it('does not render new answer button', () => {
      expect(rendersNewAnswerBtn(wrapper)).toBe(false);
    });
  });

  describe('for an input question', () => {
    beforeEach(() => {
      wrapper = mount(AnswersEditor, {
        propsData: {
          questionKind: AssessmentItemTypes.INPUT_QUESTION,
          answers: [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: true, order: 2 },
          ],
        },
      });
    });

    it('renders all possible answers', () => {
      // The answer text won't render when `mount()` is used so we override
      // and use shallowMount here
      wrapper = shallowMount(AnswersEditor, {
        propsData: {
          questionKind: AssessmentItemTypes.INPUT_QUESTION,
          answers: [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: true, order: 2 },
          ],
        },
      });
      expect(wrapper.html()).toContain('Mayonnaise (I mean you can, but...)');
      expect(wrapper.html()).toContain('Peanut butter');
    });

    it('renders new answer button', () => {
      expect(rendersNewAnswerBtn(wrapper)).toBe(true);
    });

    describe('on new answer button click', () => {
      beforeEach(() => {
        clickNewAnswerBtn(wrapper);
      });

      it('emits update event with a payload containing all answers + new answer which is correct', () => {
        expect(wrapper.emitted().update).toBeTruthy();
        expect(wrapper.emitted().update.length).toBe(1);
        expect(wrapper.emitted().update[0][0]).toEqual([
          { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
          { answer: 'Peanut butter', correct: true, order: 2 },
          { answer: '', correct: true, order: 3 },
        ]);
      });
    });
  });

  describe('on an answer click', () => {
    beforeEach(() => {
      wrapper = mount(AnswersEditor, {
        propsData: {
          questionKind: AssessmentItemTypes.SINGLE_SELECTION,
          answers: [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: false, order: 2 },
          ],
        },
      });

      clickAnswer(wrapper, 1);
    });

    it('emits open event with a correct answer idx', () => {
      expect(wrapper.emitted().open).toBeTruthy();
      expect(wrapper.emitted().open.length).toBe(1);
      expect(wrapper.emitted().open[0][0]).toBe(1);
    });
  });

  describe('on new answer button click', () => {
    beforeEach(() => {
      wrapper = mount(AnswersEditor, {
        propsData: {
          questionKind: AssessmentItemTypes.SINGLE_SELECTION,
          answers: [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: '  ', correct: true, order: 2 },
            { answer: 'Peanut butter', correct: false, order: 3 },
          ],
        },
      });

      clickNewAnswerBtn(wrapper);
    });

    it('emits update event with a payload containing all answers and one new empty answer', () => {
      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0][0]).toEqual([
        { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
        { answer: '  ', correct: true, order: 2 },
        { answer: 'Peanut butter', correct: false, order: 3 },
        { answer: '', correct: false, order: 4 },
      ]);
    });

    it('emits open event with a new answer idx', () => {
      expect(wrapper.emitted().open).toBeTruthy();
      expect(wrapper.emitted().open.length).toBe(1);
      expect(wrapper.emitted().open[0][0]).toBe(3);
    });
  });

  describe('on answer text update', () => {
    beforeEach(() => {
      wrapper = mount(AnswersEditor, {
        propsData: {
          questionKind: AssessmentItemTypes.SINGLE_SELECTION,
          answers: [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: false, order: 2 },
          ],
          openAnswerIdx: 1,
        },
      });

      // only one editor is rendered at a time => "wrapper.find"
      wrapper.find({ name: 'MarkdownEditor' }).vm.$emit('update', 'European butter');
    });

    it('emits update event with a payload containing updated answers', () => {
      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0][0]).toEqual([
        { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
        { answer: 'European butter', correct: false, order: 2 },
      ]);
    });
  });

  describe('on correct answer change', () => {
    beforeEach(() => {
      wrapper = mount(AnswersEditor, {
        propsData: {
          questionKind: AssessmentItemTypes.SINGLE_SELECTION,
          answers: [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: false, order: 2 },
          ],
          openAnswerIdx: 1,
        },
      });

      wrapper.findAll('[data-test=answerRadio]').at(1).setChecked();
    });

    it('emits update event with a payload containing updated answers', () => {
      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0][0]).toEqual([
        { answer: 'Mayonnaise (I mean you can, but...)', correct: false, order: 1 },
        { answer: 'Peanut butter', correct: true, order: 2 },
      ]);
    });
  });

  describe('on move answer up click', () => {
    beforeEach(() => {
      wrapper = mount(AnswersEditor, {
        propsData: {
          questionKind: AssessmentItemTypes.SINGLE_SELECTION,
          answers: [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: false, order: 2 },
          ],
        },
      });
    });

    it('emits update event with a payload containing updated and properly ordered answers', () => {
      clickMoveAnswerUp(wrapper, 1);

      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0][0]).toEqual([
        { answer: 'Peanut butter', correct: false, order: 1 },
        { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 2 },
      ]);
    });

    describe('if moved answer was open', () => {
      beforeEach(() => {
        wrapper.setProps({
          openAnswerIdx: 1,
        });
      });

      it('emits open event with updated answer index', () => {
        clickMoveAnswerUp(wrapper, 1);

        expect(wrapper.emitted().open).toBeTruthy();
        expect(wrapper.emitted().open.length).toBe(1);
        expect(wrapper.emitted().open[0][0]).toBe(0);
      });
    });

    describe('if an answer above a moved answer was open', () => {
      beforeEach(() => {
        wrapper.setProps({
          openAnswerIdx: 0,
        });

        clickMoveAnswerUp(wrapper, 1);
      });

      it('emits open event with updated, originally open, answer index', () => {
        expect(wrapper.emitted().open).toBeTruthy();
        expect(wrapper.emitted().open.length).toBe(1);
        expect(wrapper.emitted().open[0][0]).toBe(1);
      });
    });
  });

  describe('on move answer down click', () => {
    beforeEach(() => {
      wrapper = mount(AnswersEditor, {
        propsData: {
          questionKind: AssessmentItemTypes.SINGLE_SELECTION,
          answers: [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: false, order: 2 },
          ],
        },
      });
    });

    it('emits update event with a payload containing updated and properly ordered answers', () => {
      clickMoveAnswerDown(wrapper, 0);

      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0][0]).toEqual([
        { answer: 'Peanut butter', correct: false, order: 1 },
        { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 2 },
      ]);
    });

    describe('if moved answer was open', () => {
      beforeEach(() => {
        wrapper.setProps({
          openAnswerIdx: 0,
        });
      });

      it('emits open event with updated answer index', () => {
        clickMoveAnswerDown(wrapper, 0);

        expect(wrapper.emitted().open).toBeTruthy();
        expect(wrapper.emitted().open.length).toBe(1);
        expect(wrapper.emitted().open[0][0]).toBe(1);
      });
    });

    describe('if an answer below a moved answer was open', () => {
      beforeEach(() => {
        wrapper.setProps({
          openAnswerIdx: 1,
        });

        clickMoveAnswerDown(wrapper, 0);
      });

      it('emits open event with updated, originally open, answer index', () => {
        expect(wrapper.emitted().open).toBeTruthy();
        expect(wrapper.emitted().open.length).toBe(1);
        expect(wrapper.emitted().open[0][0]).toBe(0);
      });
    });
  });

  describe('on delete answer click', () => {
    beforeEach(() => {
      wrapper = mount(AnswersEditor, {
        propsData: {
          questionKind: AssessmentItemTypes.SINGLE_SELECTION,
          answers: [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: false, order: 2 },
          ],
        },
      });
    });

    it('emits update event with a payload containing updated and properly ordered answers', () => {
      clickDeleteAnswer(wrapper, 0);

      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0][0]).toEqual([
        { answer: 'Peanut butter', correct: false, order: 1 },
      ]);
    });

    describe('if deleted answer was open', () => {
      beforeEach(() => {
        wrapper.setProps({
          openAnswerIdx: 0,
        });
      });

      it('emits close event', () => {
        clickDeleteAnswer(wrapper, 0);

        expect(wrapper.emitted().close).toBeTruthy();
        expect(wrapper.emitted().close.length).toBe(1);
      });
    });

    describe('if an answer below a deleted answer was open', () => {
      beforeEach(() => {
        wrapper.setProps({
          openAnswerIdx: 1,
        });

        clickDeleteAnswer(wrapper, 0);
      });

      it('emits open event with updated, originally open, answer index', () => {
        expect(wrapper.emitted().open).toBeTruthy();
        expect(wrapper.emitted().open.length).toBe(1);
        expect(wrapper.emitted().open[0][0]).toBe(0);
      });
    });
  });
});
