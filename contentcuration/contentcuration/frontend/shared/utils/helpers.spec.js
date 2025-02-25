/* eslint-disable vue/one-component-per-file */

import Vue from 'vue';
import { mount } from '@vue/test-utils';
import each from 'jest-each';

import { insertBefore, insertAfter, swapElements, extendSlot } from './helpers';

describe('insertBefore', () => {
  each([
    [[], 0, 'pink', ['pink']],
    [['blue', 'yellow', 'violet'], -1, 'pink', ['pink', 'blue', 'yellow', 'violet']],
    [['blue', 'yellow', 'violet'], 0, 'pink', ['pink', 'blue', 'yellow', 'violet']],
    [['blue', 'yellow', 'violet'], 1, 'pink', ['blue', 'pink', 'yellow', 'violet']],
  ]).it('inserts a new item before another item', (arr, idx, item, expected) => {
    expect(insertBefore(arr, idx, item)).toEqual(expected);
  });
});

describe('insertAfter', () => {
  each([
    [[], 2, 'pink', ['pink']],
    [['blue', 'yellow', 'violet'], 3, 'pink', ['blue', 'yellow', 'violet', 'pink']],
    [['blue', 'yellow', 'violet'], 2, 'pink', ['blue', 'yellow', 'violet', 'pink']],
    [['blue', 'yellow', 'violet'], 1, 'pink', ['blue', 'yellow', 'pink', 'violet']],
  ]).it('inserts a new item after another item', (arr, idx, item, expected) => {
    expect(insertAfter(arr, idx, item)).toEqual(expected);
  });
});

describe('swapElements', () => {
  each([
    [['blue', 'yellow', 'violet'], 0, 0, ['blue', 'yellow', 'violet']],
    [['blue', 'yellow', 'violet'], 0, 2, ['violet', 'yellow', 'blue']],
  ]).it('swaps two elements', (arr, idx1, idx2, expected) => {
    expect(swapElements(arr, idx1, idx2)).toEqual(expected);
  });
});

describe('extendSlot', () => {
  // Component that implements extendSlot functionality
  const extenderComponent = Vue.component('Extender', {
    data() {
      return {
        val: 0,
      };
    },
    methods: {
      /**
       * @public
       * @param val
       */
      setVal(val) {
        this.val = val;
      },
      eventTestEmitter() {
        this.$emit('eventTest');
      },
      extendSlot,
    },
    render() {
      return this.extendSlot(
        'default',
        {
          class: {
            'greater-than-one': this.val > 1,
            'less-than-one': this.val < 1,
          },
          on: {
            click: this.eventTestEmitter,
          },
        },
        { val: this.val },
      );
    },
  });

  function withLayout(template, overrides = {}) {
    const component = Vue.component('TestRoot', {
      template,
      ...overrides,
    });

    let root = null;
    let eventTest = null;

    beforeEach(async () => {
      eventTest = jest.fn();
      root = mount(component, { methods: { eventTest } });
      await root.vm.$nextTick();
    });
    afterEach(() => {
      if (root) {
        root.destroy();
      }

      root = null;
      eventTest = null;
    });

    return {
      $nextTick: () => root.vm.$nextTick(),
      get root() {
        return root;
      },
      get extender() {
        return this.get(extenderComponent);
      },
      get(selector) {
        const els = root.findAll(selector);
        expect(els.length).toBeLessThanOrEqual(1);
        return els.length ? els.at(0) : null;
      },
      events: {
        get eventTest() {
          return eventTest;
        },
      },
    };
  }

  describe('with scoped slot', () => {
    describe('containing simple element', () => {
      const layout = withLayout(`
        <extender @eventTest="eventTest">
          <template #default="{ val }">
            <div class="scoped-el" :data-val="val">
              <span>Something</span>
            </div>
          </template>
        </extender>
    `);

      it('should render correctly initially', async () => {
        const el = layout.get('.scoped-el');
        expect(el).not.toBeNull();
        expect(el.contains('span')).toBe(true);
      });

      it('should pass scoped parameters and update', async () => {
        const el = layout.get('.scoped-el');
        expect(el.attributes('data-val')).toBe('0');

        layout.extender.vm.setVal(2);
        await layout.$nextTick();

        expect(el.attributes('data-val')).toBe('2');
      });

      it('should allow extending CSS classes', async () => {
        const el = layout.get('.scoped-el');

        expect(el.classes('less-than-one')).toBe(true);
        expect(el.classes('greater-than-one')).toBe(false);

        layout.extender.vm.setVal(2);
        await layout.$nextTick();

        expect(el.classes('less-than-one')).toBe(false);
        expect(el.classes('greater-than-one')).toBe(true);
      });

      it('should allow hooking in events', async () => {
        const el = layout.get('.scoped-el');
        await el.trigger('click');
        await layout.$nextTick();
        expect(layout.events.eventTest).toHaveBeenCalledTimes(1);
      });
    });

    describe('containing component', () => {
      const other = Vue.component('Other', {
        template: `<div class="scoped-el"><slot></slot></div>`,
      });
      const layout = withLayout(
        `
          <extender data-prop="something" @eventTest="eventTest">
            <template #default="">
              <other @testE="() => {}">
                <span>Something</span>
              </other>
            </template>
          </extender>
        `,
        { components: { other } },
      );

      it('should render correctly initially', async () => {
        const el = layout.get('.scoped-el');
        expect(el).not.toBeNull();
        expect(el.contains('span')).toBe(true);
      });

      it('should allow extending CSS classes', async () => {
        const el = layout.get('.scoped-el');

        expect(el.classes('less-than-one')).toBe(true);
        expect(el.classes('greater-than-one')).toBe(false);

        layout.extender.vm.setVal(2);
        await layout.$nextTick();
        await layout.$nextTick();

        expect(el.classes('less-than-one')).toBe(false);
        expect(el.classes('greater-than-one')).toBe(true);
      });

      it('should allow hooking in events', async () => {
        const el = layout.get('.scoped-el');
        await el.trigger('click');
        await layout.$nextTick();
        expect(layout.events.eventTest).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('with unscoped slot', () => {
    describe('containing simple element', () => {
      const layout = withLayout(`
        <extender data-prop="something" @eventTest="eventTest">
          <div class="unscoped-el">
            <span>Something</span>
          </div>
        </extender>
      `);

      it('should render correctly initially', async () => {
        const el = layout.get('.unscoped-el');
        expect(el).not.toBeNull();
        expect(el.contains('span')).toBe(true);
      });

      it('should allow extending CSS classes', async () => {
        const el = layout.get('.unscoped-el');

        expect(el.classes('less-than-one')).toBe(true);
        expect(el.classes('greater-than-one')).toBe(false);

        layout.extender.vm.setVal(2);
        await layout.$nextTick();
        await layout.$nextTick();

        expect(el.classes('less-than-one')).toBe(false);
        expect(el.classes('greater-than-one')).toBe(true);
      });

      it('should allow hooking in events', async () => {
        const el = layout.get('.unscoped-el');
        await el.trigger('click');
        await layout.$nextTick();
        expect(layout.events.eventTest).toHaveBeenCalledTimes(1);
      });
    });

    describe('containing component', () => {
      const other = Vue.component('Other', {
        template: `<div class="unscoped-el"><slot></slot></div>`,
      });
      const layout = withLayout(
        `
          <extender data-prop="something" @eventTest="eventTest">
            <other @testE="() => {}">
              <span>Something</span>
            </other>
          </extender>
        `,
        { components: { other } },
      );

      it('should render correctly initially', async () => {
        const el = layout.get('.unscoped-el');
        expect(el).not.toBeNull();
        expect(el.contains('span')).toBe(true);
      });

      it('should allow extending CSS classes', async () => {
        const el = layout.get('.unscoped-el');

        expect(el.classes('less-than-one')).toBe(true);
        expect(el.classes('greater-than-one')).toBe(false);

        layout.extender.vm.setVal(2);
        await layout.$nextTick();
        await layout.$nextTick();

        expect(el.classes('less-than-one')).toBe(false);
        expect(el.classes('greater-than-one')).toBe(true);
      });

      it('should allow hooking in events', async () => {
        const el = layout.get('.unscoped-el');
        await el.trigger('click');
        await layout.$nextTick();
        expect(layout.events.eventTest).toHaveBeenCalledTimes(1);
      });
    });
  });
});
