import Vue from 'vue';
import { shallowMount, mount } from '@vue/test-utils';
import Vuex, { Store } from 'vuex';
import CompletionOptions from '../CompletionOptions';
import { CompletionCriteriaModels } from 'shared/constants';

Vue.use(Vuex);

describe('CompletionOptions', () => {
  let store;
  beforeEach(() => {
    store = new Store({
      getters: {
        hasFeatureEnabled: () => () => true,
      },
    });
  });
  it('smoke test', () => {
    const wrapper = shallowMount(CompletionOptions);
    expect(wrapper.exists()).toBe(true);
  });
  describe(`completion dropdown`, () => {
    it(`renders the completion dropdown`, () => {
      const wrapper = mount(CompletionOptions);
      const dropdown = wrapper.findComponent({ ref: 'completion' });
      expect(dropdown.exists()).toBe(true);
    });
    describe(`initial, default states`, () => {
      describe(`audio/video`, () => {
        it(`'Complete duration' should be displayed by default`, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'audio',
              value: { model: null },
            },
          });
          expect(wrapper.vm.completionDropdown).toBe('completeDuration');
        });
        it(`'Complete duration' should be displayed if 'Exact time'`, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'audio',
              value: { model: 'time', threshold: 600, suggested_duration_type: 'time' },
            },
          });
          expect(wrapper.vm.completionDropdown).toBe('completeDuration');
        });
        it(`'Complete duration' should be displayed if 'Short activity'`, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'audio',
              value: {
                model: 'approx_time',
                threshold: 600,
                suggested_duration_type: 'approx_time',
              },
            },
          });
          expect(wrapper.vm.completionDropdown).toBe('completeDuration');
        });
        it(`'Complete duration' should be displayed if 'Long activity'`, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'audio',
              value: {
                model: 'approx_time',
                threshold: 6000,
                suggested_duration_type: 'approx_time',
              },
            },
          });
          expect(wrapper.vm.completionDropdown).toBe('completeDuration');
        });
        it(`'Reference' should be displayed if the model in the backend is 'reference'`, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'audio',
              value: { model: 'reference' },
            },
          });
          expect(wrapper.vm.completionDropdown).toBe('reference');
        });
      });
      describe(`document`, () => {
        it(`'All content viewed' should be displayed by default`, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'document',
              value: { model: null },
            },
          });
          expect(wrapper.vm.completionDropdown).toBe('allContent');
        });
        it(`'All content viewed' should be displayed if the model in the backend is 'pages'`, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'document',
              value: { model: 'pages', threshold: '100%' },
            },
          });
          expect(wrapper.vm.completionDropdown).toBe('allContent');
        });
        it(`'Reference' should be displayed if the model in the backend is 'reference'`, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'document',
              value: { model: 'reference' },
            },
          });
          expect(wrapper.vm.completionDropdown).toBe('reference');
        });
        it(`'Complete duration' should be displayed if 'exact time'`, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'document',
              value: {
                model: 'time',
                threshold: 1234,
                suggested_duration: 1234,
                suggested_duration_type: 'time',
              },
            },
          });
          expect(wrapper.vm.completionDropdown).toBe('completeDuration');
        });
        it(`'Complete duration' should be displayed if 'short activity'`, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'document',
              value: {
                model: 'approx_time',
                threshold: 1234,
                suggested_duration: 1234,
                suggested_duration_type: 'approx_time',
              },
            },
          });
          expect(wrapper.vm.completionDropdown).toBe('completeDuration');
        });
        it(`'Complete duration' should be displayed if 'long activity'`, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'document',
              value: {
                model: 'time',
                threshold: 1234567,
                suggested_duration: 1234567,
                suggested_duration_type: 'time',
              },
            },
          });
          expect(wrapper.vm.completionDropdown).toBe('completeDuration');
        });
      });
      describe(`exercise`, () => {
        it(`'When goal is met' should be displayed by default`, () => {
          const wrapper = mount(CompletionOptions, {
            store,
            propsData: {
              kind: 'exercise',
              value: { model: null, threshold: { m: null, n: null } },
            },
          });
          expect(wrapper.vm.completionDropdown).toBe('goal');
        });
      });
      describe(`html5 or h5p`, () => {
        it(`'When time spent is equal to duration' should be displayed by default for html5 and h5p`, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'html5',
              value: { model: null },
            },
          });
          expect(wrapper.vm.completionDropdown).toBe('completeDuration');
        });
      });
    });
    describe(`changing states`, () => {
      describe('emitted events', () => {
        it('input should be emitted when completion dropdown is updated', async () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'document',
              value: { model: null },
            },
          });
          wrapper.findComponent({ ref: 'completion' }).vm.$emit('input', 'allContent');
          await wrapper.vm.$nextTick();

          expect(wrapper.emitted('input')).toBeTruthy();
        });
      });
      describe(`reference hint`, () => {
        it(`'Reference hint is visible when 'Reference' is selected`, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              value: { model: 'reference' },
            },
          });
          expect(wrapper.vm.showReferenceHint).toBe(true);
        });
      });
      describe(`exercise`, () => {
        it(`Goal and MofN components should not be displayed when 'Practice Quiz' is selected`, async () => {
          const wrapper = mount(CompletionOptions, {
            store,
            propsData: {
              kind: 'exercise',
              value: { model: 'mastery', threshold: { m: 3, n: 5 }, modality: 'QUIZ' },
            },
          });
          wrapper.findComponent({ ref: 'completion' }).vm.$emit('input', 'practiceQuiz');
          await wrapper.vm.$nextTick();
          expect(wrapper.vm.showMasteryCriteriaGoalDropdown).toBe(false);
          expect(wrapper.vm.showMofN).toBe(false);
        });
      });
    });
  });
  describe(`duration dropdown`, () => {
    it(`renders the duration dropdown`, () => {
      const wrapper = mount(CompletionOptions, {
        propsData: {
          kind: 'audio',
          value: { suggested_duration: null },
        },
      });
      const dropdown = wrapper.findComponent({ ref: 'duration' });
      expect(dropdown.exists()).toBe(true);
    });
    describe(`default states`, () => {
      it(`'Exact time to complete' should be displayed by default for audio or video`, () => {
        const wrapper = mount(CompletionOptions, {
          propsData: {
            kind: 'audio',
            value: { suggested_duration: null },
          },
        });
        const dropdown = wrapper.findComponent({ ref: 'duration' });
        expect(dropdown.exists()).toBe(true);
        expect(wrapper.vm.durationDropdown).toBe('exactTime');
      });
      it(`duration dropdown is hidden by default for documents`, () => {
        const wrapper = mount(CompletionOptions, {
          store,
          propsData: {
            kind: 'document',
            value: { suggested_duration: null },
          },
        });
        const dropdown = wrapper.findComponent({ ref: 'duration' });
        expect(dropdown.exists()).toBe(false);
      });
      it(`duration dropdown is hidden by default for exercises`, () => {
        const wrapper = mount(CompletionOptions, {
          store,
          propsData: {
            kind: 'exercise',
            value: { model: 'mastery', threshold: { m: 3, n: 5 }, suggested_duration: null },
          },
        });
        const dropdown = wrapper.findComponent({ ref: 'duration' });
        expect(dropdown.exists()).toBe(false);
      });
      it(`'Reference' is disabled for exercises`, async () => {
        const wrapper = mount(CompletionOptions, {
          store,
          propsData: {
            kind: 'exercise',
            value: { model: 'mastery', threshold: { m: 3, n: 5 } },
          },
        });
        wrapper.findComponent({ ref: 'completion' }).vm.$emit('input', 'completeDuration');
        await wrapper.vm.$nextTick();

        const clickableDurationDropdown = wrapper.vm.selectableDurationOptions;
        expect(clickableDurationDropdown.length).toBe(3);
      });
      it(`duration dropdown is hidden by default for h5p`, () => {
        const wrapper = mount(CompletionOptions, {
          propsData: {
            kind: 'h5p',
            value: {
              suggested_duration: null,
              model: CompletionCriteriaModels.DETERMINED_BY_RESOURCE,
            },
          },
        });
        const dropdown = wrapper.findComponent({ ref: 'duration' });
        expect(dropdown.exists()).toBe(false);
      });
    });
    describe('emitted events', () => {
      it('input should be emitted when duration dropdown is updated', async () => {
        const wrapper = mount(CompletionOptions, {
          propsData: {
            kind: 'audio',
            value: { model: null },
          },
        });
        wrapper.findComponent({ ref: 'duration' }).vm.$emit('input', 'shortActivity');
        await wrapper.vm.$nextTick();

        expect(wrapper.emitted('input')).toBeTruthy();
      });
    });
    describe(`audio/video`, () => {
      it(`minutes input is displayed when 'Short activity' is selected`, async () => {
        const wrapper = mount(CompletionOptions, {
          propsData: {
            kind: 'audio',
            value: { model: null },
          },
        });
        wrapper.findComponent({ ref: 'duration' }).vm.$emit('input', 'shortActivity');
        await wrapper.vm.$nextTick();
        expect(wrapper.findComponent({ ref: 'activity_duration' }).exists()).toBe(true);
      });
      it(`minutes input is displayed when 'Long activity' is selected`, async () => {
        const wrapper = mount(CompletionOptions, {
          propsData: {
            kind: 'audio',
            value: { model: null },
          },
        });
        wrapper.findComponent({ ref: 'duration' }).vm.$emit('input', 'longActivity');
        await wrapper.vm.$nextTick();
        expect(wrapper.findComponent({ ref: 'activity_duration' }).exists()).toBe(true);
      });
    });
    describe(`document`, () => {
      // Skip these tests until we reenable descriptive duration setting.
      describe.skip(`'All content viewed' is selected as completion`, () => {
        it(`minutes input is displayed when 'Short activity' is selected`, async () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'document',
              value: { model: 'pages' },
            },
          });
          wrapper.findComponent({ ref: 'duration' }).vm.$emit('input', 'shortActivity');
          await wrapper.vm.$nextTick();
          expect(wrapper.findComponent({ ref: 'activity_duration' }).exists()).toBe(true);
        });
        it(`minutes input is displayed when 'Long activity' is selected`, async () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'document',
              value: { model: 'pages' },
            },
          });
          wrapper.findComponent({ ref: 'duration' }).vm.$emit('input', 'longActivity');
          await wrapper.vm.$nextTick();
          expect(wrapper.findComponent({ ref: 'activity_duration' }).exists()).toBe(true);
        });
        it(`minutes input is displayed when 'Exact time' is selected`, async () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'document',
              value: { model: 'pages' },
            },
          });
          wrapper.findComponent({ ref: 'duration' }).vm.$emit('input', 'exactTime');
          await wrapper.vm.$nextTick();
          expect(wrapper.findComponent({ ref: 'activity_duration' }).exists()).toBe(true);
        });
        it(`minutes input is hidden and reference hint is displayed when 'Reference' is selected`, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'document',
              value: { model: 'reference' },
            },
          });
          expect(wrapper.findComponent({ ref: 'activity_duration' }).exists()).toBe(false);
          expect(wrapper.vm.showReferenceHint).toBe(true);
        });
      });
      describe(`'Complete duration' is selected as completion`, () => {
        it(`minutes input is displayed when 'Short activity' is selected`, async () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'document',
              value: { model: 'approx_time' },
            },
          });
          wrapper.findComponent({ ref: 'duration' }).vm.$emit('input', 'shortActivity');
          await wrapper.vm.$nextTick();
          expect(wrapper.findComponent({ ref: 'activity_duration' }).exists()).toBe(true);
        });
        it(`minutes input is displayed when 'Long activity' is selected`, async () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'document',
              value: { model: 'approx_time' },
            },
          });
          wrapper.findComponent({ ref: 'duration' }).vm.$emit('input', 'longActivity');
          await wrapper.vm.$nextTick();
          expect(wrapper.findComponent({ ref: 'activity_duration' }).exists()).toBe(true);
        });
        it(`minutes input is displayed when 'Exact time' is selected`, async () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'document',
              value: { model: 'time' },
            },
          });
          wrapper.findComponent({ ref: 'duration' }).vm.$emit('input', 'exactTime');
          await wrapper.vm.$nextTick();
          expect(wrapper.findComponent({ ref: 'activity_duration' }).exists()).toBe(true);
        });
      });
      // Skip these tests until we reenable descriptive duration setting.
      describe.skip(`switching between 'All content viewed (ACV)' and 'Complete duration (CD)'`, () => {
        it(`Duration dropdown and minutes input stay the same when switching betweeen 'Short activity' in ACV and CD`, async () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'document',
              value: {
                model: 'approx_time',
                threshold: 1200,
                suggested_duration: 1200,
                suggested_duration_type: 'approx_time',
              },
            },
          });
          expect(wrapper.vm.durationDropdown).toBe('shortActivity');
          wrapper.findComponent({ ref: 'completion' }).vm.$emit('input', 'allContent');
          await wrapper.vm.$nextTick();

          expect(wrapper.vm.durationDropdown).toBe('shortActivity');
          expect(wrapper.findComponent({ ref: 'activity_duration' }).exists()).toBe(true);
          expect(wrapper.vm.durationValue).toBe(1200);
        });
        it(`Duration dropdown and minutes input stay the same when switching betweeen 'Long activity' in ACV and CD`, async () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'document',
              value: {
                model: 'approx_time',
                suggested_duration: 6000,
                suggested_duration_type: 'approx_time',
              },
            },
          });
          expect(wrapper.vm.durationDropdown).toBe('longActivity');
          wrapper.findComponent({ ref: 'completion' }).vm.$emit('input', 'allContent');
          await wrapper.vm.$nextTick();

          expect(wrapper.vm.durationDropdown).toBe('longActivity');
          expect(wrapper.findComponent({ ref: 'activity_duration' }).exists()).toBe(true);
          expect(wrapper.vm.durationValue).toBe(6000);
        });
        it(`Duration dropdown and minutes input stay the same when switching betweeen 'Exact time' in ACV and CD`, async () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'document',
              value: {
                model: 'pages',
                threshold: '100%',
                suggested_duration: 1234,
                suggested_duration_type: 'time',
              },
            },
          });
          expect(wrapper.vm.durationDropdown).toBe('exactTime');
          wrapper.findComponent({ ref: 'completion' }).vm.$emit('input', 'completeDuration');
          await wrapper.vm.$nextTick();

          expect(wrapper.vm.durationDropdown).toBe('exactTime');
          expect(wrapper.findComponent({ ref: 'activity_duration' }).exists()).toBe(true);
          expect(wrapper.vm.durationValue).toBe(1234);
        });
      });
    });
    // Skip these tests until we reenable descriptive duration setting.
    describe.skip(`exercise`, () => {
      describe(`when completion dropdown is 'Practice until goal is met'`, () => {
        it(`minutes input is displayed when 'Short activity' is selected`, async () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'exercise',
              value: { model: 'mastery', threshold: { m: 3, n: 5 } },
            },
          });
          wrapper.findComponent({ ref: 'duration' }).vm.$emit('input', 'shortActivity');
          await wrapper.vm.$nextTick();
          expect(wrapper.findComponent({ ref: 'activity_duration' }).exists()).toBe(true);
        });
        it(`minutes input is displayed when 'Long activity' is selected`, async () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'exercise',
              value: { model: 'mastery', threshold: { m: 3, n: 5 } },
            },
          });
          wrapper.findComponent({ ref: 'duration' }).vm.$emit('input', 'longActivity');
          await wrapper.vm.$nextTick();
          expect(wrapper.findComponent({ ref: 'activity_duration' }).exists()).toBe(true);
        });
        it(`minutes input is displayed when 'Exact time' is selected`, async () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'exercise',
              value: { model: 'mastery', threshold: { m: 3, n: 5 } },
            },
          });
          wrapper.findComponent({ ref: 'duration' }).vm.$emit('input', 'exactTime');
          await wrapper.vm.$nextTick();
          expect(wrapper.findComponent({ ref: 'activity_duration' }).exists()).toBe(true);
        });
      });
      describe(`when completion dropdown is 'Practice quiz'`, () => {
        it(`minutes input is displayed when 'Short activity' is selected`, async () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'exercise',
              value: { model: 'mastery', threshold: { m: 3, n: 5 }, modality: 'QUIZ' },
            },
          });
          wrapper.findComponent({ ref: 'duration' }).vm.$emit('input', 'shortActivity');
          await wrapper.vm.$nextTick();
          expect(wrapper.findComponent({ ref: 'activity_duration' }).exists()).toBe(true);
        });
        it(`minutes input is displayed when 'Long activity' is selected`, async () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'exercise',
              value: { model: 'mastery', threshold: { m: 3, n: 5 }, modality: 'QUIZ' },
            },
          });
          wrapper.findComponent({ ref: 'duration' }).vm.$emit('input', 'longActivity');
          await wrapper.vm.$nextTick();
          expect(wrapper.findComponent({ ref: 'activity_duration' }).exists()).toBe(true);
        });
        it(`minutes input is displayed when 'Exact time' is selected`, async () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'exercise',
              value: { model: 'mastery', threshold: { m: 3, n: 5 }, modality: 'QUIZ' },
            },
          });
          wrapper.findComponent({ ref: 'duration' }).vm.$emit('input', 'exactTime');
          await wrapper.vm.$nextTick();
          expect(wrapper.findComponent({ ref: 'activity_duration' }).exists()).toBe(true);
        });
      });
      describe(`switching between 'Practice until goal is met (PUGIM)' and 'Practice quiz (PQ)'`, () => {
        it(`Duration dropdown and minutes input stay the same when switching betweeen 'Short activity' in PUGIM and PQ`, async () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'exercise',
              value: {
                model: 'mastery',
                modality: 'QUIZ',
                suggested_duration: 1200,
                suggested_duration_type: 'approx_time',
                threshold: { m: 3, n: 5 },
              },
            },
          });
          expect(wrapper.vm.durationDropdown).toBe('shortActivity');
          wrapper.findComponent({ ref: 'completion' }).vm.$emit('input', 'goal');
          await wrapper.vm.$nextTick();

          expect(wrapper.vm.durationDropdown).toBe('shortActivity');
          expect(wrapper.findComponent({ ref: 'activity_duration' }).exists()).toBe(true);
          expect(wrapper.vm.durationValue).toBe(1200);
        });
        it(`Duration dropdown and minutes input stay the same when switching betweeen 'Long activity' in PUGIM and PQ`, async () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'exercise',
              value: {
                model: 'mastery',
                modality: 'QUIZ',
                suggested_duration: 6000,
                suggested_duration_type: 'approx_time',
                threshold: { m: 3, n: 5 },
              },
            },
          });
          expect(wrapper.vm.durationDropdown).toBe('longActivity');
          wrapper.findComponent({ ref: 'completion' }).vm.$emit('input', 'goal');
          await wrapper.vm.$nextTick();

          expect(wrapper.vm.durationDropdown).toBe('longActivity');
          expect(wrapper.findComponent({ ref: 'activity_duration' }).exists()).toBe(true);
          expect(wrapper.vm.durationValue).toBe(6000);
        });
        it(`Duration dropdown and minutes input stay the same when switching betweeen 'Exact time' in PUGIM and PQ`, async () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'exercise',
              value: {
                model: 'mastery',
                modality: 'QUIZ',
                suggested_duration: 1234,
                suggested_duration_type: 'time',
                threshold: { m: 3, n: 5 },
              },
            },
          });
          expect(wrapper.vm.durationDropdown).toBe('exactTime');
          wrapper.findComponent({ ref: 'completion' }).vm.$emit('input', 'completeDuration');
          await wrapper.vm.$nextTick();

          expect(wrapper.vm.durationDropdown).toBe('exactTime');
          expect(wrapper.findComponent({ ref: 'activity_duration' }).exists()).toBe(true);
          expect(wrapper.vm.durationValue).toBe(1234);
        });
      });
    });
    describe(`html5 or h5p`, () => {
      describe(`when completion dropdown is 'Determined by this resource'`, () => {
        it(`duration dropdown is always hidden`, async () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'html5',
              value: {
                suggested_duration: null,
                model: CompletionCriteriaModels.DETERMINED_BY_RESOURCE,
              },
            },
          });
          expect(wrapper.findComponent({ ref: 'activity_duration' }).exists()).toBe(false);
          expect(wrapper.findComponent({ ref: 'duration' }).exists()).toBe(false);
        });
        it(`minutes input is hidden and reference hint is displayed when 'Reference' is selected`, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'html5',
              value: { suggested_duration: null, model: 'reference' },
            },
          });
          expect(wrapper.findComponent({ ref: 'activity_duration' }).exists()).toBe(false);
          expect(wrapper.vm.showReferenceHint).toBe(true);
        });
      });
    });
    describe(`html5`, () => {
      describe(`when completion dropdown is the default value`, () => {
        it(`should emit determined by resource when it is selected`, async () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'html5',
              value: { suggested_duration: null, model: null },
            },
          });
          wrapper.findComponent({ ref: 'completion' }).vm.$emit('input', 'determinedByResource');
          await wrapper.vm.$nextTick();
          expect(wrapper.emitted('input')[0][0].completion_criteria.model).toEqual(
            CompletionCriteriaModels.DETERMINED_BY_RESOURCE,
          );
        });
      });
    });
  });
  describe(`minutes input`, () => {
    //Note: while the 'ActivityDuration' component itself is in another component,
    //the logic to get the data ready for the BE is in this component
    describe(`correct handling of values for switching from 'Exact time' to 'Short activity' or 'Long activity'`, () => {
      it(`displays default 'Short activity' value when input > the max allowed for 'Short activity'`, () => {
        const shortActivityDefaultValue = 600;
        const wrapper = mount(CompletionOptions, {
          propsData: {
            kind: 'document',
            value: {
              model: 'pages',
              threshold: '100%',
              suggested_duration: 3060,
              suggested_duration_type: 'time',
            },
          },
        });

        expect(wrapper.vm.handleMinutesInputFromActivityDuration(3060, `shortActivity`)).toBe(
          shortActivityDefaultValue,
        );
      });
      it(`displays default 'Long activity' value when input < the min allowed for 'Long activity'`, () => {
        const longActivityDefaultValue = 3000;
        const wrapper = mount(CompletionOptions, {
          propsData: {
            kind: 'document',
            value: {
              model: 'pages',
              threshold: '100%',
              suggested_duration: 50,
              suggested_duration_type: 'time',
            },
          },
        });

        expect(wrapper.vm.handleMinutesInputFromActivityDuration(50, `longActivity`)).toBe(
          longActivityDefaultValue,
        );
      });
    });
    describe(`correct handling of values for switching from 'Short activity' or 'Long activity' to 'Exact Time'`, () => {
      it(`displays 'Long activity' value`, async () => {
        const wrapper = mount(CompletionOptions, {
          propsData: {
            kind: 'document',
            value: {
              model: 'approx_time',
              threshold: 6000,
              suggested_duration: 6000,
              suggested_duration_type: 'approx_time',
            },
          },
        });
        wrapper.findComponent({ ref: 'duration' }).vm.$emit('input', 'exactTime');
        await wrapper.vm.$nextTick();
        expect(wrapper.vm.durationValue).toBe(6000);
      });
      it(`displays 'Short activity' value`, async () => {
        const wrapper = mount(CompletionOptions, {
          propsData: {
            kind: 'document',
            value: {
              model: 'approx_time',
              threshold: 200,
              suggested_duration: 200,
              suggested_duration_type: 'approx_time',
            },
          },
        });
        wrapper.findComponent({ ref: 'duration' }).vm.$emit('input', 'exactTime');
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.durationValue).toBe(200);
      });
    });
  });
});
