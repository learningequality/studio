import { shallowMount, mount } from '@vue/test-utils';

import HintsPreview from '../HintsPreview/HintsPreview.vue';

const clickToggle = wrapper => {
  wrapper.find('[data-test=toggle]').trigger('click');
};

describe('HintsPreview', () => {
  let wrapper;

  it('smoke test', () => {
    const wrapper = shallowMount(HintsPreview);

    expect(wrapper.isVueInstance()).toBe(true);
  });

  describe('with no hints', () => {
    beforeEach(() => {
      wrapper = mount(HintsPreview, {
        propsData: {
          hints: [],
        },
      });
    });

    it('renders placeholder text only', () => {
      expect(wrapper.html()).toMatchSnapshot();
    });
  });

  describe('with one hint', () => {
    beforeEach(() => {
      wrapper = mount(HintsPreview, {
        propsData: {
          hints: [{ order: 1, hint: 'Hint 1' }],
        },
      });
    });

    it('renders correct toggle label', () => {
      expect(wrapper.html()).toMatchSnapshot();
    });
  });

  describe('with more hints', () => {
    beforeEach(() => {
      wrapper = mount(HintsPreview, {
        propsData: {
          hints: [
            { order: 1, hint: 'Hint 1' },
            { order: 2, hint: 'Hint 2' },
            { order: 3, hint: 'Hint 3' },
          ],
        },
      });
    });

    it('renders correct toggle label', () => {
      expect(wrapper.html()).toMatchSnapshot();
    });
  });

  describe('', () => {
    beforeEach(() => {
      wrapper = mount(HintsPreview, {
        propsData: {
          hints: [
            { order: 1, hint: 'Hint 1' },
            { order: 2, hint: 'Hint 2' },
            { order: 3, hint: 'Hint 3' },
          ],
        },
      });
    });

    describe('on toggle click', () => {
      beforeEach(() => {
        clickToggle(wrapper);
      });

      it('renders correct toggle label and displays hints', () => {
        expect(wrapper.html()).toMatchSnapshot();
      });
    });

    describe('on second toggle click', () => {
      beforeEach(() => {
        clickToggle(wrapper);
        clickToggle(wrapper);
      });

      it('hides hints', () => {
        expect(wrapper.html()).toMatchSnapshot();
      });
    });
  });
});
