import { shallowMount, mount } from '@vue/test-utils';

import { AssessmentItemTypes } from '../../constants';
import AssessmentItemPreview from './AssessmentItemPreview';

describe('AssessmentItemPreview', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(AssessmentItemPreview, {
      propsData: {
        question: 'Question',
        kind: AssessmentItemTypes.SINGLE_SELECTION,
        answers: [
          { answer: 'Answer 1', correct: false, order: 1 },
          { answer: 'Answer 2', correct: true, order: 2 },
          { answer: 'Answer 3', correct: false, order: 3 },
        ],
        hints: [{ hint: 'Hint 1', order: 1 }, { hint: 'Hint 2', order: 2 }],
      },
    });
  });

  it('smoke test', () => {
    const wrapper = shallowMount(AssessmentItemPreview);

    expect(wrapper.isVueInstance()).toBe(true);
  });

  it('renders', () => {
    expect(wrapper.html()).toMatchSnapshot();
  });

  describe('if detailed true', () => {
    beforeEach(() => {
      wrapper.setProps({
        detailed: true,
      });
    });

    it('displays answers and hints toggle', () => {
      expect(wrapper.html()).toMatchSnapshot();
    });

    it('displays hints on hints toggle click', () => {
      wrapper.find('[data-test="hintsToggle"]').trigger('click');

      expect(wrapper.html()).toMatchSnapshot();
    });
  });
});
