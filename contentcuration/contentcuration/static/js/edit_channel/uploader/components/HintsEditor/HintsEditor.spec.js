import { shallowMount, mount } from '@vue/test-utils';

import HintsEditor from './HintsEditor';

const clickNewHintBtn = wrapper => {
  wrapper
    .find('[data-test=newHintBtn]')
    .find('button')
    .trigger('click');
};

const clickHintToggle = (wrapper, hintIdx) => {
  wrapper
    .findAll('[data-test=hintToggle]')
    .at(hintIdx)
    .find('i')
    .trigger('click');
};

const updateOpenHintText = (wrapper, newHintText) => {
  // only one hint can be open
  wrapper.find('[data-test=editHintTextInput]').setValue(newHintText);
};

describe('HintsEditor', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(HintsEditor, {
      propsData: {
        hints: [{ hint: 'First hint', order: 1 }, { hint: 'Second hint', order: 2 }],
      },
    });
  });

  it('smoke test', () => {
    const wrapper = shallowMount(HintsEditor);

    expect(wrapper.isVueInstance()).toBe(true);
  });

  describe('with no hints', () => {
    beforeEach(() => {
      wrapper.setProps({
        hints: [],
      });
    });

    it('renders a placeholder', () => {
      expect(wrapper.html()).toContain('No hints yet');
    });
  });

  it('renders all hints', () => {
    expect(wrapper.html()).toContain('First hint');
    expect(wrapper.html()).toContain('Second hint');
  });

  describe('on new hint button click', () => {
    beforeEach(() => {
      clickNewHintBtn(wrapper);
    });

    it('emits update event with a payload containing all hints + new hint', () => {
      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0][0]).toEqual([
        { hint: 'First hint', order: 1 },
        { hint: 'Second hint', order: 2 },
        { hint: '', order: 3 },
      ]);
    });
  });

  describe('on hint toggle click', () => {
    it('opens/closes a correct hint', () => {
      const hintIdx = 1;

      expect(wrapper.contains('[data-test=editHintTextInput]')).toBe(false);

      clickHintToggle(wrapper, hintIdx);
      const editHintTextInputs = wrapper.findAll('[data-test=editHintTextInput]');
      expect(editHintTextInputs.length).toBe(1);
      expect(editHintTextInputs.at(0).element.value).toBe('Second hint');

      clickHintToggle(wrapper, hintIdx);
      expect(wrapper.contains('[data-test=editHintTextInput]')).toBe(false);
    });
  });

  describe('on hint text update', () => {
    beforeEach(() => {
      clickHintToggle(wrapper, 1);
      updateOpenHintText(wrapper, 'Second updated hint');
    });

    it('emits update event with a payload containing updated hints', () => {
      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0][0]).toEqual([
        { hint: 'First hint', order: 1 },
        { hint: 'Second updated hint', order: 2 },
      ]);
    });
  });
});
