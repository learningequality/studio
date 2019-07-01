import { shallowMount, mount } from '@vue/test-utils';

import { AssessmentItemTypes } from '../../constants';
import AnswersEditor from './AnswersEditor';

const clickNewAnswerBtn = wrapper => {
  wrapper
    .find('[data-test=newAnswerBtn]')
    .find('button')
    .trigger('click');
};

const rendersNewAnswerBtn = wrapper => {
  return wrapper.contains('[data-test=newAnswerBtn]');
};

const clickAnswer = (wrapper, answerIdx) => {
  wrapper
    .findAll('[data-test=answer]')
    .at(answerIdx)
    .trigger('click');
};

const clickMoveAnswerUp = (wrapper, answerIdx) => {
  wrapper
    .findAll('[data-test=toolbarIconArrowUp]')
    .at(answerIdx)
    .trigger('click');
};

const clickMoveAnswerDown = (wrapper, answerIdx) => {
  wrapper
    .findAll('[data-test=toolbarIconArrowDown]')
    .at(answerIdx)
    .trigger('click');
};

const clickDeleteAnswer = (wrapper, answerIdx) => {
  wrapper
    .findAll('[data-test=toolbarIconDelete]')
    .at(answerIdx)
    .trigger('click');
};

const updateOpenAnswerText = (wrapper, newAnswerText) => {
  // only one answer can be open
  wrapper.find('[data-test=editAnswerTextInput]').setValue(newAnswerText);
};

describe('AnswersEditor', () => {
  let wrapper;

  it('smoke test', () => {
    const wrapper = shallowMount(AnswersEditor);

    expect(wrapper.isVueInstance()).toBe(true);
  });

  describe('with no answers', () => {
    beforeEach(() => {
      wrapper = mount(AnswersEditor, {
        propsData: {
          answers: [],
        },
      });
    });

    it('renders a placeholder', () => {
      expect(wrapper.html()).toContain('No answers yet');
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

    it('renders answers as radio selects', () => {
      const inputs = wrapper.findAll('input');
      const labels = wrapper.findAll('label');

      expect(inputs.length).toBe(2);
      expect(labels.length).toBe(2);

      for (let n in [0, 1]) {
        expect(inputs.at(n).attributes()['type']).toBe('radio');
      }

      expect(labels.at(0).text()).toBe('Mayonnaise (I mean you can, but...)');
      expect(labels.at(1).text()).toBe('Peanut butter');
    });

    it('renders a correct answer as checked', () => {
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
      const labels = wrapper.findAll('label');

      expect(inputs.length).toBe(3);
      expect(labels.length).toBe(3);

      for (let n in [0, 1, 2]) {
        expect(inputs.at(n).attributes()['type']).toBe('checkbox');
      }

      expect(labels.at(0).text()).toBe('Mayonnaise (I mean you can, but...)');
      expect(labels.at(1).text()).toBe('Peanut butter');
      expect(labels.at(2).text()).toBe('Jelly');
    });

    it('renders all correct answers as checked', () => {
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
      const labels = wrapper.findAll('label');

      expect(inputs.length).toBe(2);
      expect(labels.length).toBe(2);

      for (let n in [0, 1]) {
        expect(inputs.at(n).attributes()['type']).toBe('radio');
      }

      expect(labels.at(0).text()).toBe('True');
      expect(labels.at(1).text()).toBe('False');
    });

    it('renders a correct answer as checked', () => {
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

  describe('on answer text update', () => {
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
      updateOpenAnswerText(wrapper, 'Irish butter');
    });

    it('emits update event with a payload containing updated answers', () => {
      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0][0]).toEqual([
        { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
        { answer: 'Irish butter', correct: false, order: 2 },
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
        },
      });

      clickAnswer(wrapper, 1);
      wrapper
        .findAll('[data-test=answerRadio]')
        .at(1)
        .setChecked();
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

      clickMoveAnswerUp(wrapper, 1);
    });

    it('emits update event with a payload containing updated and properly ordered answers', () => {
      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0][0]).toEqual([
        { answer: 'Peanut butter', correct: false, order: 1 },
        { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 2 },
      ]);
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

      clickMoveAnswerDown(wrapper, 0);
    });

    it('emits update event with a payload containing updated and properly ordered answers', () => {
      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0][0]).toEqual([
        { answer: 'Peanut butter', correct: false, order: 1 },
        { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 2 },
      ]);
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

      clickDeleteAnswer(wrapper, 0);
    });

    it('emits update event with a payload containing updated and properly ordered answers', () => {
      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0][0]).toEqual([
        { answer: 'Peanut butter', correct: false, order: 1 },
      ]);
    });
  });
});
