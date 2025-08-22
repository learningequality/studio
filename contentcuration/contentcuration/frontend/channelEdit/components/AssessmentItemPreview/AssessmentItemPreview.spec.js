import { mount } from '@vue/test-utils';

import AssessmentItemPreview from './AssessmentItemPreview';
import { AssessmentItemTypes } from 'shared/constants';

jest.mock('shared/views/TipTapEditor/TipTapEditor/TipTapEditor.vue');

describe('AssessmentItemPreview', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(AssessmentItemPreview, {
      propsData: {
        item: {
          question: 'Question',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          answers: [
            { answer: 'Answer 1', correct: false, order: 1 },
            { answer: 'Answer 2', correct: true, order: 2 },
            { answer: 'Answer 3', correct: false, order: 3 },
          ],
          hints: [
            { hint: 'Hint 1', order: 1 },
            { hint: 'Hint 2', order: 2 },
          ],
        },
      },
    });
  });

  it('smoke test', () => {
    expect(wrapper.exists()).toBe(true);
  });

  it('renders question', () => {
    // Find the RichTextEditor for the question and check its value prop.
    const questionEditor = wrapper.findComponent({ name: 'RichTextEditor' });
    expect(questionEditor.props('value')).toBe('Question');
  });

  it("doesn't render answers by default", () => {
    expect(wrapper.html()).not.toContain('Answer 1');
    expect(wrapper.html()).not.toContain('Answer 2');
    expect(wrapper.html()).not.toContain('Answer 3');
  });

  it("doesn't render hints and hints toggle by default", () => {
    expect(wrapper.findComponent('[data-test="hintsToggle"]').exists()).toBe(false);

    expect(wrapper.html()).not.toContain('Hint 1');
    expect(wrapper.html()).not.toContain('Hint 2');
  });

  describe('if detailed true', () => {
    beforeEach(async () => {
      await wrapper.setProps({
        detailed: true,
      });
    });

    it('renders answers', () => {
      const editors = wrapper.findAllComponents({ name: 'RichTextEditor' });
      // We expect 1 for the question + 3 for the answers = 4 total editors.
      expect(editors.length).toBe(4);

      expect(editors.at(1).props('value')).toBe('Answer 1');
      expect(editors.at(2).props('value')).toBe('Answer 2');
      expect(editors.at(3).props('value')).toBe('Answer 3');
    });

    it("doesn't render hints", () => {
      expect(wrapper.html()).not.toContain('Hint 1');
      expect(wrapper.html()).not.toContain('Hint 2');
    });

    it('renders hints toggle', () => {
      expect(wrapper.find('[data-test="hintsToggle"]').exists()).toBe(true);
    });

    it('renders hints on hints toggle click', async () => {
      await wrapper.find('[data-test="hintsToggle"]').trigger('click');

      // After clicking, there should be more editors for the hints.
      // 1 (question) + 3 (answers) + 2 (hints) = 6 total editors.
      const editors = wrapper.findAllComponents({ name: 'RichTextEditor' });
      expect(editors.length).toBe(6);

      expect(editors.at(4).props('value')).toBe('Hint 1');
      expect(editors.at(5).props('value')).toBe('Hint 2');
    });
  });
});
