import Vue from 'vue';
import Vuetify from 'vuetify';
import { shallowMount, mount } from '@vue/test-utils';
import ActivityDuration from '../ActivityDuration.vue';

Vue.use(Vuetify);

describe('ActivityDuration', () => {
  it('smoke test', () => {
    const wrapper = shallowMount(ActivityDuration);
    expect(wrapper.isVueInstance()).toBe(true);
  });

  describe(`minutes input`, () => {
    const shortActivityMin = 1;
    const shortActivityMax = 30;
    const longActivityMin = 31;
    const longActivityMax = 120;
    describe(`default state for audio/video resources`, () => {
      it(`should display a static upload time when 'Exact time to complete' for audio/video resources as initial state`, () => {
        const defaultValue = '17:12';
        const wrapper = shallowMount(ActivityDuration);
        expect(wrapper.vm.defaultUploadTime).toEqual(defaultValue);
      });
      it(`should display the file's time at upload when 'Exact time to complete' is chosen in Completiond dropdown`, () => {
        // TODO: defaultValue will need to be changed when file-upload-duration is implemented
        const defaultValue = '17:12';
        const wrapper = shallowMount(ActivityDuration, {
          propsData: { duration: 123 },
        });
        expect(wrapper.props('duration')).toEqual(123);
        expect(wrapper.vm.defaultUploadTime).not.toEqual(defaultValue);
        expect(wrapper.vm.defaultUploadTime).toEqual(123);
      });
      it(`should display a "stand-in" at upload if file's time at upload is not available when 'Exact time to complete' is chosen in Completiond dropdown`, () => {
        // TODO: defaultValue will need to be changed when file-upload-duration is implemented
        const defaultValue = '17:12';
        const wrapper = shallowMount(ActivityDuration, {
          propsData: { duration: null },
        });
        expect(wrapper.props('duration')).toEqual(null);
        expect(wrapper.vm.defaultUploadTime).toEqual(defaultValue);
        expect(wrapper.vm.defaultUploadTime).not.toEqual(null);
      });
    });

    describe(`convert seconds to minutes for display`, () => {
      it(`should convert seconds into minutes`, () => {
        const wrapper = shallowMount(ActivityDuration);
        expect(wrapper.vm.convertToMinutes(3000)).toBe(50);
      });
      it(`should display the seconds passed down from parent as minutes`, () => {
        const wrapper = shallowMount(ActivityDuration, {
          propsData: { value: 600 },
        });
        let seconds = wrapper.props('value');
        expect(wrapper.props('value')).toEqual(600);
        expect(wrapper.vm.convertToMinutes(seconds)).toBe(10);

        wrapper.setProps({ value: 4800 });
        seconds = wrapper.props('value');
        expect(wrapper.props('value')).toEqual(4800);
        expect(wrapper.vm.convertToMinutes(seconds)).toBe(80);
      });
    });

    describe(`convert minutes to seconds to emit to parent`, () => {
      it(`should convert minutes to seconds before emitting`, () => {
        const wrapper = shallowMount(ActivityDuration);
        expect(wrapper.vm.convertToSeconds(40)).toBe(2400);
      });
      it(`should emit time to parent`, () => {
        const seconds = 2400;
        const wrapper = mount(ActivityDuration);
        wrapper.vm.$emit('input', seconds);

        return Vue.nextTick().then(() => {
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
      it(`minimum accepted input should be 1 minute`, () => {
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
      it(`minimum accepted input should be 31 minutes`, () => {
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
        '(Optional) Duration until resource is marked as complete. This value will not be shown to learners.';
      const requiredHint =
        'Duration until resource is marked as complete. This value will not be shown to learners.';
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
