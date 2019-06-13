import { shallowMount, mount } from '@vue/test-utils';

import Toggle from './Toggle';

const clickArrowUp = wrapper => {
  wrapper.find('[data-test=iconArrowUp]').trigger('click');
};

const clickArrowDown = wrapper => {
  wrapper.find('[data-test=iconArrowDown]').trigger('click');
};

describe('Toggle', () => {
  let wrapper;

  it('smoke test', () => {
    const wrapper = shallowMount(Toggle);

    expect(wrapper.isVueInstance()).toBe(true);
  });

  describe('when open', () => {
    beforeEach(() => {
      wrapper = mount(Toggle, {
        propsData: {
          isOpen: true,
        },
      });
    });

    describe('when closed', () => {
      beforeEach(() => {
        wrapper = mount(Toggle, {
          propsData: {
            isOpen: false,
          },
        });
      });

      it('renders arrow down', () => {
        expect(wrapper.html()).toContain('keyboard_arrow_down');
        expect(wrapper.html()).not.toContain('keyboard_arrow_up');
      });

      it('emits open event on click', () => {
        clickArrowDown(wrapper);

        expect(wrapper.emitted().open).toBeTruthy();
        expect(wrapper.emitted().open.length).toBe(1);
      });
    });

    it('renders arrow up', () => {
      expect(wrapper.html()).toContain('keyboard_arrow_up');
      expect(wrapper.html()).not.toContain('keyboard_arrow_down');
    });

    it('emits close event on click', () => {
      clickArrowUp(wrapper);

      expect(wrapper.emitted().close).toBeTruthy();
      expect(wrapper.emitted().close.length).toBe(1);
    });
  });
});
