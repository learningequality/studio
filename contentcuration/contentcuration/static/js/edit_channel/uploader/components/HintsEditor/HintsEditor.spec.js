import { shallowMount, mount } from '@vue/test-utils';

import HintsEditor from './HintsEditor';

const clickNewHintBtn = wrapper => {
  wrapper
    .find('[data-test=newHintBtn]')
    .find('button')
    .trigger('click');
};

const clickHint = (wrapper, hintIdx) => {
  wrapper
    .findAll('[data-test=hint]')
    .at(hintIdx)
    .trigger('click');
};

const clickMoveHintUp = (wrapper, hintIdx) => {
  wrapper
    .findAll('[data-test=toolbarIconArrowUp]')
    .at(hintIdx)
    .trigger('click');
};

const clickMoveHintDown = (wrapper, hintIdx) => {
  wrapper
    .findAll('[data-test=toolbarIconArrowDown]')
    .at(hintIdx)
    .trigger('click');
};

const clickDeleteHint = (wrapper, hintIdx) => {
  wrapper
    .findAll('[data-test=toolbarIconDelete]')
    .at(hintIdx)
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
    expect(wrapper.html()).toMatchSnapshot();
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

  describe('on hint click', () => {
    it('opens a correct hint', () => {
      clickHint(wrapper, 1);

      expect(wrapper.html()).toMatchSnapshot();
    });
  });

  describe('on hint text update', () => {
    beforeEach(() => {
      clickHint(wrapper, 1);
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

  describe('on move hint up click', () => {
    beforeEach(() => {
      clickMoveHintUp(wrapper, 1);
    });

    it('emits update event with a payload containing updated and properly ordered hints', () => {
      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0][0]).toEqual([
        { hint: 'Second hint', order: 1 },
        { hint: 'First hint', order: 2 },
      ]);
    });
  });

  describe('on move hint down click', () => {
    beforeEach(() => {
      clickMoveHintDown(wrapper, 0);
    });

    it('emits update event with a payload containing updated and properly ordered hints', () => {
      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0][0]).toEqual([
        { hint: 'Second hint', order: 1 },
        { hint: 'First hint', order: 2 },
      ]);
    });
  });

  describe('on delete hint click', () => {
    beforeEach(() => {
      clickDeleteHint(wrapper, 0);
    });

    it('emits update event with a payload containing updated and properly ordered hints', () => {
      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0][0]).toEqual([{ hint: 'Second hint', order: 1 }]);
    });
  });
});
