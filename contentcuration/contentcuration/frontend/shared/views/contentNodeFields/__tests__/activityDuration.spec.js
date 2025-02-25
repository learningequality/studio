import { shallowMount, mount } from '@vue/test-utils';
import ActivityDuration from '../CompletionOptions/ActivityDuration';

describe('ActivityDuration', () => {
  it('smoke test', () => {
    const wrapper = shallowMount(ActivityDuration);
    expect(wrapper.isVueInstance()).toBe(true);
  });

  describe(`minutes input`, () => {
    const shortActivityMin = 5;
    const shortActivityMax = 30;
    const longActivityMin = 40;
    const longActivityMax = 120;

    describe(`convert seconds to minutes for display`, () => {
      it(`should display the seconds passed down from parent as minutes`, () => {
        const wrapper = shallowMount(ActivityDuration, {
          propsData: { value: 600 },
        });
        expect(wrapper.vm.minutes).toBe(10);
        wrapper.setProps({ value: 4821 });
        return wrapper.vm.$nextTick().then(() => {
          expect(wrapper.vm.minutes).toBe(80);
        });
      });
    });

    describe(`convert minutes to seconds to emit to parent`, () => {
      it(`should emit time to parent`, () => {
        const seconds = 2400;
        const wrapper = mount(ActivityDuration);
        wrapper.vm.minutes = 40;

        return wrapper.vm.$nextTick().then(() => {
          const emittedTime = wrapper.emitted('input').pop()[0];
          expect(emittedTime).toEqual(seconds);
        });
      });
    });

    describe(`in 'Short activity'`, () => {
      const wrapper = mount(ActivityDuration, {
        propsData: {
          selectedDuration: 'shortActivity',
        },
      });
      it(`should increment by 5-minute intervals`, () => {
        expect(wrapper.html()).toContain(`step="5"`);
        expect(wrapper.html()).not.toContain(`step="10"`);
      });
      it(`minimum accepted input should be 5 minutes`, () => {
        expect(wrapper.vm.minRange).toBe(shortActivityMin);
        expect(wrapper.vm.minRange).not.toBe(longActivityMin);
      });
      it(`maximum accepted input should be 30 minutes`, () => {
        expect(wrapper.vm.maxRange).toBe(shortActivityMax);
        expect(wrapper.vm.maxRange).not.toBe(longActivityMax);
      });
    });

    describe(`in 'Long activity'`, () => {
      const wrapper = mount(ActivityDuration, {
        propsData: {
          selectedDuration: 'longActivity',
        },
      });
      it(`should increment by 10-minute intervals`, () => {
        expect(wrapper.html()).toContain(`step="10"`);
        expect(wrapper.html()).not.toContain(`step="5"`);
      });
      it(`minimum accepted input should be 40 minutes`, () => {
        expect(wrapper.vm.minRange).not.toBe(shortActivityMin);
        expect(wrapper.vm.minRange).toBe(longActivityMin);
      });
      it(`maximum accepted input should be 120 minutes`, () => {
        expect(wrapper.vm.maxRange).not.toBe(shortActivityMax);
        expect(wrapper.vm.maxRange).toBe(longActivityMax);
      });
    });

    describe(`hints`, () => {
      const optionalHint =
        '(Optional) Time required for the resource to be marked as completed. This value will not be displayed to learners.';
      const requiredHint =
        'Time required for the resource to be marked as completed. This value will not be displayed to learners.';
      describe(`audio/video resource`, () => {
        it(`should display optional hint when 'Short activity' is chosen`, () => {
          const wrapper = shallowMount(ActivityDuration, {
            propsData: {
              audioVideoUpload: true,
              selectedDuration: 'shortActivity',
            },
          });
          expect(wrapper.html()).toContain(optionalHint);
        });
        it(`should display optional hint when 'Long activity' is chosen`, () => {
          const wrapper = shallowMount(ActivityDuration, {
            propsData: {
              audioVideoUpload: true,
              selectedDuration: 'longActivity',
            },
          });
          expect(wrapper.html()).toContain(optionalHint);
        });
        it(`should not display any hints when 'Exact time to complete' is chosen`, () => {
          const wrapper = shallowMount(ActivityDuration, {
            propsData: {
              audioVideoUpload: true,
              selectedDuration: 'exactTime',
            },
          });
          expect(wrapper.html()).not.toContain(requiredHint);
          expect(wrapper.html()).not.toContain(optionalHint);
        });
      });
      describe(`all other resources`, () => {
        it(`should display optional hint when 'All content viewed' is selected in the Completion dropdown and 'Short/Long activity' is chosen`, () => {
          const wrapper = shallowMount(ActivityDuration, {
            propsData: {
              audioVideoUpload: false,
              selectedCompletion: 'allContent',
              selectedDuration: 'shortActivity',
            },
          });
          expect(wrapper.html()).toContain(optionalHint);
        });
        it(`should display required hint when 'Complete duration' is selected in the Completion dropdown and 'Short/Long activity' is chosen`, () => {
          const wrapper = shallowMount(ActivityDuration, {
            propsData: {
              audioVideoUpload: false,
              selectedCompletion: 'completeDuration',
              selectedDuration: 'shortActivity',
            },
          });
          expect(wrapper.html()).not.toContain('(Optional)');
          expect(wrapper.html()).toContain(requiredHint);
        });
        it(`should not display any hints when 'Exact time to complete' is chosen`, () => {
          const wrapper = shallowMount(ActivityDuration, {
            propsData: {
              audioVideoUpload: false,
              selectedDuration: 'exactTime',
            },
          });
          expect(wrapper.html()).not.toContain(requiredHint);
          expect(wrapper.html()).not.toContain(optionalHint);
        });
      });
    });
  });
});
