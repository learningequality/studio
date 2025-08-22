import { mount } from '@vue/test-utils';

import AssessmentItemPreview from './AssessmentItemPreview';
import { AssessmentItemTypes } from 'shared/constants';

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
    expect(wrapper.html()).toContain('Question');
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
      expect(wrapper.html()).toContain('Answer 1');
      expect(wrapper.html()).toContain('Answer 2');
      expect(wrapper.html()).toContain('Answer 3');
    });

    it("doesn't render hints", () => {
      expect(wrapper.html()).not.toContain('Hint 1');
      expect(wrapper.html()).not.toContain('Hint 2');
    });

    it('renders hints toggle', () => {
      expect(wrapper.findComponent('[data-test="hintsToggle"]').exists()).toBe(true);
    });

    it('renders hints on hints toggle click', async () => {
      await wrapper.findComponent('[data-test="hintsToggle"]').trigger('click');

      expect(wrapper.html()).toContain('Hint 1');
      expect(wrapper.html()).toContain('Hint 2');
    });
  });
});
