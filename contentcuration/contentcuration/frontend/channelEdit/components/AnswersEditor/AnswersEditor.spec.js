import { shallowMount, mount } from '@vue/test-utils';

import { AssessmentItemToolbarActions } from '../../constants';
import AnswersEditor from './AnswersEditor';
import { AssessmentItemTypes } from 'shared/constants';
import TipTapEditor from 'shared/views/TipTapEditor/TipTapEditor/TipTapEditor.vue';

jest.mock('shared/views/TipTapEditor/TipTapEditor/TipTapEditor.vue');

jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => {
  return function useKResponsiveWindow() {
    const { ref } = require('vue');
    return { windowIsSmall: ref(false) };
  };
});

const clickNewAnswerBtn = async wrapper => {
  await wrapper.findComponent('[data-test="newAnswerBtn"]').trigger('click');
};

const rendersNewAnswerBtn = wrapper => {
  return wrapper.findComponent('[data-test="newAnswerBtn"]').exists();
};

const clickAnswer = async (wrapper, answerIdx) => {
  await wrapper.findAll('[data-test="answer"]').at(answerIdx).trigger('click');
};

const clickMoveAnswerUp = async (wrapper, answerIdx) => {
  await wrapper
    .findAllComponents(`[data-test="toolbarIcon-${AssessmentItemToolbarActions.MOVE_ITEM_UP}"]`)
    .at(answerIdx)
    .trigger('click');
};

const clickMoveAnswerDown = async (wrapper, answerIdx) => {
  await wrapper
    .findAllComponents(`[data-test="toolbarIcon-${AssessmentItemToolbarActions.MOVE_ITEM_DOWN}"]`)
    .at(answerIdx)
    .trigger('click');
};

const clickDeleteAnswer = async (wrapper, answerIdx) => {
  await wrapper
    .findAllComponents(`[data-test="toolbarIcon-${AssessmentItemToolbarActions.DELETE_ITEM}"]`)
    .at(answerIdx)
    .trigger('click');
};

describe('AnswersEditor', () => {
  let wrapper;

  it('smoke test', () => {
    const wrapper = shallowMount(AnswersEditor);

    expect(wrapper.exists()).toBe(true);
  });

  it('renders a placeholder when there are no answers', () => {
    wrapper = mount(AnswersEditor, {
      propsData: {
        answers: [],
      },
    });

    expect(wrapper.html()).toContain('Question has no answer options');
  });

  describe('answers label', () => {
    it.each([
      [AssessmentItemTypes.SINGLE_SELECTION, AnswersEditor.$trs.answersLabelSingleChoice],
      [AssessmentItemTypes.TRUE_FALSE, AnswersEditor.$trs.answersLabelSingleChoice],
      [AssessmentItemTypes.MULTIPLE_SELECTION, AnswersEditor.$trs.answersLabelMultipleChoice],
      [AssessmentItemTypes.INPUT_QUESTION, AnswersEditor.$trs.answersLabelNumeric],
    ])('renders the correct label for %s questions', (questionKind, expectedLabel) => {
      wrapper = shallowMount(AnswersEditor, {
        propsData: {
          questionKind,
          answers: [],
        },
      });

      expect(wrapper.text()).toContain(expectedLabel);
    });
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

    it('renders answers as radio controls', () => {
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

    it('marks correct answer rows with the selected visual state', () => {
      const answerRows = wrapper.findAll('[data-test="answer"]');

      // Correct row has both border-color and background-color applied
      expect(answerRows.at(0).attributes('style')).toContain('border-color');
      expect(answerRows.at(0).attributes('style')).toContain('background-color');
      // Incorrect row has border-color but no inline background-color (null omits it)
      expect(answerRows.at(1).attributes('style')).toContain('border-color');
      expect(answerRows.at(1).attributes('style')).not.toContain('background-color');
    });

    it('renders all possible answers', () => {
      // First answer is open by default (openAnswerIdx=0) — edit mode TipTapEditor
      // Second answer is closed — view mode TipTapEditor
      const editors = wrapper.findAllComponents(TipTapEditor);

      // Closed answer uses view mode to safely render rich text
      const viewEditor = editors.filter(e => e.props('mode') === 'view').at(0);
      expect(viewEditor.exists()).toBe(true);
      expect(viewEditor.props('value')).toBe('Peanut butter');

      // Open answer uses edit mode
      const editEditor = editors.filter(e => e.props('mode') === 'edit').at(0);
      expect(editEditor.exists()).toBe(true);
      expect(editEditor.props('value')).toBe('Mayonnaise (I mean you can, but...)');
    });

    it('renders new answer button', () => {
      expect(rendersNewAnswerBtn(wrapper)).toBe(true);
      expect(wrapper.findComponent('[data-test="newAnswerBtn"]').text()).toContain(
        AnswersEditor.$trs.addOptionBtnLabel,
      );
    });

    describe('on new answer button click', () => {
      beforeEach(async () => {
        await clickNewAnswerBtn(wrapper);
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

    it('renders all possible answers', () => {
      // First answer is open by default (openAnswerIdx=0) — edit mode TipTapEditor
      // Remaining answers are closed — each gets a view mode TipTapEditor
      const editors = wrapper.findAllComponents(TipTapEditor);

      const viewEditors = editors.filter(e => e.props('mode') === 'view');
      expect(viewEditors.length).toBe(2);
      expect(viewEditors.at(0).props('value')).toBe('Peanut butter');
      expect(viewEditors.at(1).props('value')).toBe('Jelly');

      const editEditor = editors.filter(e => e.props('mode') === 'edit').at(0);
      expect(editEditor.exists()).toBe(true);
      expect(editEditor.props('value')).toBe('Mayonnaise (I mean you can, but...)');
    });

    it('renders new answer button', () => {
      expect(rendersNewAnswerBtn(wrapper)).toBe(true);
      expect(wrapper.findComponent('[data-test="newAnswerBtn"]').text()).toContain(
        AnswersEditor.$trs.addOptionBtnLabel,
      );
    });

    describe('on new answer button click', () => {
      beforeEach(async () => {
        await clickNewAnswerBtn(wrapper);
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

    it('renders answers as radio controls', () => {
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
            { answer: '1.5', correct: true, order: 1 },
            { answer: '2', correct: true, order: 2 },
          ],
        },
      });
    });

    it('renders open answer as a number input and closed answer as plain text', () => {
      expect(wrapper.find('input[type="number"]').element.value).toBe('1.5');

      expect(wrapper.html()).toContain('2');
    });

    it('renders new answer button', () => {
      expect(rendersNewAnswerBtn(wrapper)).toBe(true);
      expect(wrapper.findComponent('[data-test="newAnswerBtn"]').text()).toContain(
        AnswersEditor.$trs.newAnswerBtnLabel,
      );
    });

    describe('on new answer button click', () => {
      beforeEach(async () => {
        await clickNewAnswerBtn(wrapper);
      });

      it('emits update event with a payload containing all answers + new answer which is correct', () => {
        expect(wrapper.emitted().update).toBeTruthy();
        expect(wrapper.emitted().update.length).toBe(1);
        expect(wrapper.emitted().update[0][0]).toEqual([
          { answer: '1.5', correct: true, order: 1 },
          { answer: '2', correct: true, order: 2 },
          { answer: '', correct: true, order: 3 },
        ]);
      });
    });
  });

  describe('autofocus on the open answer editor', () => {
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
    });

    it('passes autofocus=true to the open (edit-mode) answer editor', () => {
      // A single TipTapEditor per answer switches mode reactively.
      // The editor for openAnswerIdx has mode='edit' and autofocus=true.
      const editors = wrapper.findAllComponents(TipTapEditor);
      const editModeEditor = editors.filter(e => e.props('mode') === 'edit').at(0);
      expect(editModeEditor.props('autofocus')).toBe(true);
    });
  });

  describe('on an answer click', () => {
    beforeEach(async () => {
      wrapper = mount(AnswersEditor, {
        propsData: {
          questionKind: AssessmentItemTypes.SINGLE_SELECTION,
          answers: [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: false, order: 2 },
          ],
        },
      });

      await clickAnswer(wrapper, 1);
    });

    it('emits open event with a correct answer idx', () => {
      expect(wrapper.emitted().open).toBeTruthy();
      expect(wrapper.emitted().open.length).toBe(1);
      expect(wrapper.emitted().open[0][0]).toBe(1);
    });
  });

  describe('on new answer button click', () => {
    beforeEach(async () => {
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

      await clickNewAnswerBtn(wrapper);
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
    beforeEach(async () => {
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

      const editors = wrapper.findAllComponents(TipTapEditor);
      editors.at(1).vm.$emit('update', 'European butter');

      await wrapper.vm.$nextTick();
    });

    it('emits update event with a payload containing updated answers', () => {
      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);

      const emittedAnswers = JSON.parse(JSON.stringify(wrapper.emitted().update[0][0]));

      expect(emittedAnswers).toEqual([
        { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
        { answer: 'European butter', correct: false, order: 2 },
      ]);
    });
  });

  describe('on correct answer change', () => {
    beforeEach(async () => {
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

      await wrapper.vm.$nextTick();
      await wrapper.findAll('.answer-selection input[type="radio"]').at(1).trigger('click');
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

    it('emits update event with a payload containing updated and properly ordered answers', async () => {
      await clickMoveAnswerUp(wrapper, 1);

      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0][0]).toEqual([
        { answer: 'Peanut butter', correct: false, order: 1 },
        { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 2 },
      ]);
    });

    describe('if moved answer was open', () => {
      beforeEach(async () => {
        await wrapper.setProps({
          openAnswerIdx: 1,
        });
      });

      it('emits open event with updated answer index', async () => {
        await clickMoveAnswerUp(wrapper, 1);

        expect(wrapper.emitted().open).toBeTruthy();
        expect(wrapper.emitted().open.length).toBe(1);
        expect(wrapper.emitted().open[0][0]).toBe(0);
      });
    });

    describe('if an answer above a moved answer was open', () => {
      beforeEach(async () => {
        await wrapper.setProps({
          openAnswerIdx: 0,
        });

        await clickMoveAnswerUp(wrapper, 1);
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

    it('emits update event with a payload containing updated and properly ordered answers', async () => {
      await clickMoveAnswerDown(wrapper, 0);

      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0][0]).toEqual([
        { answer: 'Peanut butter', correct: false, order: 1 },
        { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 2 },
      ]);
    });

    describe('if moved answer was open', () => {
      beforeEach(async () => {
        await wrapper.setProps({
          openAnswerIdx: 0,
        });
      });

      it('emits open event with updated answer index', async () => {
        await clickMoveAnswerDown(wrapper, 0);

        expect(wrapper.emitted().open).toBeTruthy();
        expect(wrapper.emitted().open.length).toBe(1);
        expect(wrapper.emitted().open[0][0]).toBe(1);
      });
    });

    describe('if an answer below a moved answer was open', () => {
      beforeEach(async () => {
        await wrapper.setProps({
          openAnswerIdx: 1,
        });

        await clickMoveAnswerDown(wrapper, 0);
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

    it('emits update event with a payload containing updated and properly ordered answers', async () => {
      await clickDeleteAnswer(wrapper, 0);

      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0][0]).toEqual([
        { answer: 'Peanut butter', correct: false, order: 1 },
      ]);
    });

    describe('if deleted answer was open', () => {
      beforeEach(async () => {
        await wrapper.setProps({
          openAnswerIdx: 0,
        });
      });

      it('emits close event', async () => {
        await clickDeleteAnswer(wrapper, 0);

        expect(wrapper.emitted().close).toBeTruthy();
        expect(wrapper.emitted().close.length).toBe(1);
      });
    });

    describe('if an answer below a deleted answer was open', () => {
      beforeEach(async () => {
        await wrapper.setProps({
          openAnswerIdx: 1,
        });

        await clickDeleteAnswer(wrapper, 0);
      });

      it('emits open event with updated, originally open, answer index', () => {
        expect(wrapper.emitted().open).toBeTruthy();
        expect(wrapper.emitted().open.length).toBe(1);
        expect(wrapper.emitted().open[0][0]).toBe(0);
      });
    });
  });
});
