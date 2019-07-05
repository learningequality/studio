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

    it('emits open event with a new hint idx', () => {
      expect(wrapper.emitted().open).toBeTruthy();
      expect(wrapper.emitted().open.length).toBe(1);
      expect(wrapper.emitted().open[0][0]).toBe(2);
    });
  });

  describe('on hint click', () => {
    it('emits open event with a correct hint idx', () => {
      clickHint(wrapper, 1);

      expect(wrapper.emitted().open).toBeTruthy();
      expect(wrapper.emitted().open.length).toBe(1);
      expect(wrapper.emitted().open[0][0]).toBe(1);
    });
  });

  describe('on hint text update', () => {
    beforeEach(() => {
      wrapper = mount(HintsEditor, {
        propsData: {
          hints: [{ hint: 'First hint', order: 1 }, { hint: 'Second hint', order: 2 }],
          openHintIdx: 1,
        },
      });

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
    it('emits update event with a payload containing updated and properly ordered hints', () => {
      clickMoveHintUp(wrapper, 1);

      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0][0]).toEqual([
        { hint: 'Second hint', order: 1 },
        { hint: 'First hint', order: 2 },
      ]);
    });

    describe('if moved hint was open', () => {
      beforeEach(() => {
        wrapper.setProps({
          openHintIdx: 1,
        });

        clickMoveHintUp(wrapper, 1);
      });

      it('emits open event with updated hint index', () => {
        expect(wrapper.emitted().open).toBeTruthy();
        expect(wrapper.emitted().open.length).toBe(1);
        expect(wrapper.emitted().open[0][0]).toBe(0);
      });
    });

    describe('if a hint above a moved hint was open', () => {
      beforeEach(() => {
        wrapper.setProps({
          openHintIdx: 0,
        });

        clickMoveHintUp(wrapper, 1);
      });

      it('emits open event with updated, originally open, hint index', () => {
        expect(wrapper.emitted().open).toBeTruthy();
        expect(wrapper.emitted().open.length).toBe(1);
        expect(wrapper.emitted().open[0][0]).toBe(1);
      });
    });
  });

  describe('on move hint down click', () => {
    it('emits update event with a payload containing updated and properly ordered hints', () => {
      clickMoveHintDown(wrapper, 0);

      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0][0]).toEqual([
        { hint: 'Second hint', order: 1 },
        { hint: 'First hint', order: 2 },
      ]);
    });

    describe('if moved hint was open', () => {
      beforeEach(() => {
        wrapper.setProps({
          openHintIdx: 0,
        });

        clickMoveHintDown(wrapper, 0);
      });

      it('emits open event with updated hint index', () => {
        expect(wrapper.emitted().open).toBeTruthy();
        expect(wrapper.emitted().open.length).toBe(1);
        expect(wrapper.emitted().open[0][0]).toBe(1);
      });
    });

    describe('if a hint below a moved hint was open', () => {
      beforeEach(() => {
        wrapper.setProps({
          openHintIdx: 1,
        });

        clickMoveHintDown(wrapper, 0);
      });

      it('emits open event with updated, originally open, hint index', () => {
        expect(wrapper.emitted().open).toBeTruthy();
        expect(wrapper.emitted().open.length).toBe(1);
        expect(wrapper.emitted().open[0][0]).toBe(0);
      });
    });
  });

  describe('on delete hint click', () => {
    it('emits update event with a payload containing updated and properly ordered hints', () => {
      clickDeleteHint(wrapper, 0);

      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0][0]).toEqual([{ hint: 'Second hint', order: 1 }]);
    });

    describe('if deleted hint was open', () => {
      beforeEach(() => {
        wrapper.setProps({
          openHintIdx: 0,
        });

        clickDeleteHint(wrapper, 0);
      });

      it('emits close event', () => {
        expect(wrapper.emitted().close).toBeTruthy();
        expect(wrapper.emitted().close.length).toBe(1);
      });
    });

    describe('if a hint below a deleted hint was open', () => {
      beforeEach(() => {
        wrapper.setProps({
          openHintIdx: 1,
        });

        clickDeleteHint(wrapper, 0);
      });

      it('emits open event with updated, originally open, hint index', () => {
        expect(wrapper.emitted().open).toBeTruthy();
        expect(wrapper.emitted().open.length).toBe(1);
        expect(wrapper.emitted().open[0][0]).toBe(0);
      });
    });
  });
});
