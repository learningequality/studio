import { shallowMount, mount } from '@vue/test-utils';

import { AssessmentItemToolbarActions } from '../../constants';

import HintsEditor from './HintsEditor';

jest.mock('shared/views/MarkdownEditor/MarkdownEditor/MarkdownEditor.vue');
jest.mock('shared/views/MarkdownEditor/MarkdownViewer/MarkdownViewer.vue');

const clickNewHintBtn = async wrapper => {
  await wrapper.findComponent('[data-test=newHintBtn]').find('button').trigger('click');
};

const clickHint = async (wrapper, hintIdx) => {
  await wrapper.findAll('[data-test=hint]').at(hintIdx).trigger('click');
};

const clickMoveHintUp = async (wrapper, hintIdx) => {
  await wrapper
    .findAllComponents(`[data-test="toolbarIcon-${AssessmentItemToolbarActions.MOVE_ITEM_UP}"]`)
    .at(hintIdx)
    .trigger('click');
};

const clickMoveHintDown = async (wrapper, hintIdx) => {
  await wrapper
    .findAllComponents(`[data-test="toolbarIcon-${AssessmentItemToolbarActions.MOVE_ITEM_DOWN}"]`)
    .at(hintIdx)
    .trigger('click');
};

const clickDeleteHint = async (wrapper, hintIdx) => {
  await wrapper
    .findAllComponents(`[data-test="toolbarIcon-${AssessmentItemToolbarActions.DELETE_ITEM}"]`)
    .at(hintIdx)
    .trigger('click');
};

describe('HintsEditor', () => {
  let wrapper;

  it('smoke test', () => {
    const wrapper = shallowMount(HintsEditor);

    expect(wrapper.exists()).toBe(true);
  });

  it('renders a placeholder when there are no hints', () => {
    wrapper = mount(HintsEditor, {
      propsData: {
        hints: [],
      },
    });

    expect(wrapper.html()).toContain('Question has no hints');
  });

  it('renders all hints in a correct order', () => {
    wrapper = mount(HintsEditor, {
      propsData: {
        hints: [
          { hint: 'First hint', order: 1 },
          { hint: 'Second hint', order: 2 },
        ],
      },
    });

    const hints = wrapper.findAll('[data-test="hint"]');

    expect(hints.length).toBe(2);
    expect(hints.at(0).html()).toContain('First hint');
    expect(hints.at(1).html()).toContain('Second hint');
  });

  describe('on hint text update', () => {
    beforeEach(() => {
      wrapper = mount(HintsEditor, {
        propsData: {
          hints: [
            { hint: 'First hint', order: 1 },
            { hint: 'Second hint', order: 2 },
          ],
          openHintIdx: 1,
        },
      });

      // only one editor is rendered at a time => "wrapper.find"
      wrapper.findComponent({ name: 'MarkdownEditor' }).vm.$emit('update', 'Updated hint');
    });

    it('emits update event with a payload containing updated hints', () => {
      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0][0]).toEqual([
        { hint: 'First hint', order: 1 },
        { hint: 'Updated hint', order: 2 },
      ]);
    });
  });

  describe('on new hint button click', () => {
    beforeEach(async () => {
      wrapper = mount(HintsEditor, {
        propsData: {
          hints: [
            { hint: 'First hint', order: 1 },
            { hint: '', order: 2 },
            { hint: 'Third hint', order: 3 },
          ],
        },
      });

      await clickNewHintBtn(wrapper);
    });

    it('emits update event with a payload containing all non-empty hints and one new empty hint', () => {
      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0][0]).toEqual([
        { hint: 'First hint', order: 1 },
        { hint: 'Third hint', order: 2 },
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
    beforeEach(async () => {
      wrapper = mount(HintsEditor, {
        propsData: {
          hints: [
            { hint: 'First hint', order: 1 },
            { hint: 'Second hint', order: 2 },
          ],
        },
      });

      await clickHint(wrapper, 1);
    });

    it('emits open event with a correct hint idx', () => {
      expect(wrapper.emitted().open).toBeTruthy();
      expect(wrapper.emitted().open.length).toBe(1);
      expect(wrapper.emitted().open[0][0]).toBe(1);
    });
  });

  describe('on move hint up click', () => {
    beforeEach(() => {
      wrapper = mount(HintsEditor, {
        propsData: {
          hints: [
            { hint: 'First hint', order: 1 },
            { hint: 'Second hint', order: 2 },
          ],
        },
      });
    });

    it('emits update event with a payload containing updated and properly ordered hints', async () => {
      await clickMoveHintUp(wrapper, 1);

      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0][0]).toEqual([
        { hint: 'Second hint', order: 1 },
        { hint: 'First hint', order: 2 },
      ]);
    });

    describe('if moved hint was open', () => {
      beforeEach(async () => {
        await wrapper.setProps({
          openHintIdx: 1,
        });

        await clickMoveHintUp(wrapper, 1);
      });

      it('emits open event with updated hint index', () => {
        expect(wrapper.emitted().open).toBeTruthy();
        expect(wrapper.emitted().open.length).toBe(1);
        expect(wrapper.emitted().open[0][0]).toBe(0);
      });
    });

    describe('if a hint above a moved hint was open', () => {
      beforeEach(async () => {
        await wrapper.setProps({
          openHintIdx: 0,
        });

        await clickMoveHintUp(wrapper, 1);
      });

      it('emits open event with updated, originally open, hint index', () => {
        expect(wrapper.emitted().open).toBeTruthy();
        expect(wrapper.emitted().open.length).toBe(1);
        expect(wrapper.emitted().open[0][0]).toBe(1);
      });
    });
  });

  describe('on move hint down click', () => {
    beforeEach(() => {
      wrapper = mount(HintsEditor, {
        propsData: {
          hints: [
            { hint: 'First hint', order: 1 },
            { hint: 'Second hint', order: 2 },
          ],
        },
      });
    });

    it('emits update event with a payload containing updated and properly ordered hints', async () => {
      await clickMoveHintDown(wrapper, 0);

      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0][0]).toEqual([
        { hint: 'Second hint', order: 1 },
        { hint: 'First hint', order: 2 },
      ]);
    });

    describe('if moved hint was open', () => {
      beforeEach(async () => {
        await wrapper.setProps({
          openHintIdx: 0,
        });

        await clickMoveHintDown(wrapper, 0);
      });

      it('emits open event with updated hint index', () => {
        expect(wrapper.emitted().open).toBeTruthy();
        expect(wrapper.emitted().open.length).toBe(1);
        expect(wrapper.emitted().open[0][0]).toBe(1);
      });
    });

    describe('if a hint below a moved hint was open', () => {
      beforeEach(async () => {
        await wrapper.setProps({
          openHintIdx: 1,
        });

        await clickMoveHintDown(wrapper, 0);
      });

      it('emits open event with updated, originally open, hint index', () => {
        expect(wrapper.emitted().open).toBeTruthy();
        expect(wrapper.emitted().open.length).toBe(1);
        expect(wrapper.emitted().open[0][0]).toBe(0);
      });
    });
  });

  describe('on delete hint click', () => {
    beforeEach(() => {
      wrapper = mount(HintsEditor, {
        propsData: {
          hints: [
            { hint: 'First hint', order: 1 },
            { hint: 'Second hint', order: 2 },
          ],
        },
      });
    });

    it('emits update event with a payload containing updated and properly ordered hints', async () => {
      await clickDeleteHint(wrapper, 0);

      expect(wrapper.emitted().update).toBeTruthy();
      expect(wrapper.emitted().update.length).toBe(1);
      expect(wrapper.emitted().update[0][0]).toEqual([{ hint: 'Second hint', order: 1 }]);
    });

    describe('if deleted hint was open', () => {
      beforeEach(async () => {
        await wrapper.setProps({
          openHintIdx: 0,
        });

        await clickDeleteHint(wrapper, 0);
      });

      it('emits close event', () => {
        expect(wrapper.emitted().close).toBeTruthy();
        expect(wrapper.emitted().close.length).toBe(1);
      });
    });

    describe('if a hint below a deleted hint was open', () => {
      beforeEach(async () => {
        await wrapper.setProps({
          openHintIdx: 1,
        });

        await clickDeleteHint(wrapper, 0);
      });

      it('emits open event with updated, originally open, hint index', () => {
        expect(wrapper.emitted().open).toBeTruthy();
        expect(wrapper.emitted().open.length).toBe(1);
        expect(wrapper.emitted().open[0][0]).toBe(0);
      });
    });
  });
});
