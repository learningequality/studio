import { shallowMount, mount } from '@vue/test-utils';

import { AssessmentItemTypes } from '../../constants';
import AnswersPreview from './AnswersPreview';

describe('AnswersPreview', () => {
  let wrapper;

  it('smoke test', () => {
    const wrapper = shallowMount(AnswersPreview);

    expect(wrapper.isVueInstance()).toBe(true);
  });

  describe('with no answers', () => {
    beforeEach(() => {
      wrapper = shallowMount(AnswersPreview, {
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
      wrapper = mount(AnswersPreview, {
        propsData: {
          questionKind: AssessmentItemTypes.SINGLE_SELECTION,
          answers: [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: false, order: 2 },
          ],
        },
      });
    });

    it('renders answers as disabled radio selects', () => {
      const inputs = wrapper.findAll('input');
      const labels = wrapper.findAll('label');

      expect(inputs.length).toBe(2);
      expect(labels.length).toBe(2);

      for (let n in [0, 1]) {
        expect(inputs.at(n).attributes()['type']).toBe('radio');
        expect(inputs.at(n).attributes()['disabled']).toBeTruthy();
      }

      expect(labels.at(0).text()).toBe('Mayonnaise (I mean you can, but...)');
      expect(labels.at(1).text()).toBe('Peanut butter');
    });

    it('renders a correct answer as checked', () => {
      const inputs = wrapper.findAll('input');

      expect(inputs.at(0).element.checked).toBe(true);
      expect(inputs.at(1).element.checked).toBe(false);
    });
  });

  describe('for a multiple selection question', () => {
    beforeEach(() => {
      wrapper = mount(AnswersPreview, {
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

    it('renders answers as disabled checkboxes', () => {
      const inputs = wrapper.findAll('input');
      const labels = wrapper.findAll('label');

      expect(inputs.length).toBe(3);
      expect(labels.length).toBe(3);

      for (let n in [0, 1, 2]) {
        expect(inputs.at(n).attributes()['type']).toBe('checkbox');
        expect(inputs.at(n).attributes()['disabled']).toBeTruthy();
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
  });

  describe('for a true/false question', () => {
    beforeEach(() => {
      wrapper = mount(AnswersPreview, {
        propsData: {
          questionKind: AssessmentItemTypes.TRUE_FALSE,
          answers: [
            { answer: 'True', correct: false, order: 1 },
            { answer: 'False', correct: true, order: 2 },
          ],
        },
      });
    });

    it('renders answers as disabled radio selects', () => {
      const inputs = wrapper.findAll('input');
      const labels = wrapper.findAll('label');

      expect(inputs.length).toBe(2);
      expect(labels.length).toBe(2);

      for (let n in [0, 1]) {
        expect(inputs.at(n).attributes()['type']).toBe('radio');
        expect(inputs.at(n).attributes()['disabled']).toBeTruthy();
      }

      expect(labels.at(0).text()).toBe('True');
      expect(labels.at(1).text()).toBe('False');
    });

    it('renders a correct answer as checked', () => {
      const inputs = wrapper.findAll('input');

      expect(inputs.at(0).element.checked).toBe(false);
      expect(inputs.at(1).element.checked).toBe(true);
    });
  });

  describe('for an input question', () => {
    beforeEach(() => {
      wrapper = mount(AnswersPreview, {
        propsData: {
          questionKind: AssessmentItemTypes.INPUT_QUESTION,
          answers: [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: true, order: 2 },
          ],
        },
      });
    });

    it('renders all answers', () => {
      expect(
        wrapper
          .findAll('li')
          .at(0)
          .text()
      ).toBe('Mayonnaise (I mean you can, but...)');
      expect(
        wrapper
          .findAll('li')
          .at(1)
          .text()
      ).toBe('Peanut butter');
    });
  });
});
