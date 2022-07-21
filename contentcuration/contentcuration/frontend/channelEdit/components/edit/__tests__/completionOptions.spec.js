import Vue from 'vue';
import Vuetify from 'vuetify';
import { shallowMount, mount } from '@vue/test-utils';
import CompletionOptions from '../CompletionOptions.vue';

Vue.use(Vuetify);

describe('CompletionOptions', () => {
  it('smoke test', () => {
    const wrapper = shallowMount(CompletionOptions);
    expect(wrapper.isVueInstance()).toBe(true);
  });

  describe(`completion dropdown`, () => {
    it(`renders the completion dropdown`, () => {
      const wrapper = mount(CompletionOptions);
      const dropdown = wrapper.find({ ref: 'completion' });
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
        it(`'Complete duration' should be displayed if the model in the backend is 'exact time', 'short activity', or 'long activity'`, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'audio',
              value: { model: 'exactTime' },
            },
          });
          expect(wrapper.vm.completionDropdown).toBe('completeDuration');
        });
        it(`'Complete duration' should be displayed if the model in the backend is 'exact time'`, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'audio',
              value: { model: 'exactTime' },
            },
          });
          expect(wrapper.vm.completionDropdown).toBe('completeDuration');
        });
        it(`'Complete duration' should be displayed if the model in the backend is 'short activity'`, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'audio',
              value: { model: 'shortActivity' },
            },
          });
          expect(wrapper.vm.completionDropdown).toBe('completeDuration');
        });
        it(`'Complete duration' should be displayed if the model in the backend is 'long activity'`, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'audio',
              value: { model: 'longActivity' },
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
        it(`'All content viewed' should be displayed if the model in the backend is 'reference'`, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'document',
              value: { model: 'reference' },
            },
          });
          expect(wrapper.vm.completionDropdown).toBe('allContent');
        });
        it(`'All content viewed' should be displayed if the model in the backend is 'pages'`, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'document',
              value: { model: 'pages' },
            },
          });
          expect(wrapper.vm.completionDropdown).toBe('allContent');
        });
        it(`'Complete duration' should be displayed if the model in the backend is 'exact time'`, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'document',
              value: { model: 'exactTime' },
            },
          });
          expect(wrapper.vm.completionDropdown).toBe('completeDuration');
        });
        it(`'Complete duration' should be displayed if the model in the backend is 'short activity'`, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'document',
              value: { model: 'shortActivity' },
            },
          });
          expect(wrapper.vm.completionDropdown).toBe('completeDuration');
        });
        it(`'Complete duration' should be displayed if the model in the backend is 'long activity'`, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'document',
              value: { model: 'shortActivity' },
            },
          });
          expect(wrapper.vm.completionDropdown).toBe('completeDuration');
        });
      });
      describe(`exercise`, () => {
        it(`'Practice until goal is met' should be displayed by default if 'practice quiz' is enabled `, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'exercise',
              value: { model: null },
            },
          });
          expect(wrapper.vm.completionDropdown).toBe('goal');
        });
        it(`Completion dropdown should not be displayed if 'practice quiz' is not enabled while 'Practice until goal is met' is set in background`, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'exercise',
              value: { model: null, modality: 'QUIZ' },
              practiceQuizzesAllowed: false,
            },
          });
          expect(wrapper.find({ ref: 'completion' }).exists()).toBe(false);
          expect(wrapper.vm.completionDropdown).toBe('goal');
        });
      });
      describe(`html5 or h5p`, () => {
        it(`'Complete duration' should be displayed by default for html5`, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'html5',
              value: { model: null },
            },
          });
          expect(wrapper.vm.completionDropdown).toBe('completeDuration');
        });
        it(`'Determined by this resource' should be displayed if there is no model in the backend for h5p`, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'h5p',
              value: { model: null },
            },
          });
          expect(wrapper.vm.completionDropdown).toBe('determinedByResource');
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
          wrapper.find({ ref: 'completion' }).vm.$emit('input', 'allContent');
          await wrapper.vm.$nextTick();

          expect(wrapper.emitted('input')).toBeTruthy();
        });
      });
      describe(`audio/video`, () => {
        it(`'Duration dropdown' is not visible and reference hint is visible when 'Reference' is selected`, () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'audio',
              value: { model: 'reference' },
            },
          });
          expect(wrapper.vm.showReferenceHint).toBe(true);
          expect(wrapper.find({ ref: 'duration' }).exists()).toBe(false);

          // wrapper.find({ ref: 'completion' }).vm.$emit('input', 'reference');
          // await wrapper.vm.$nextTick();

          // console.log(wrapper.vm.audioVideoResource)
          // console.log(wrapper.vm.value);
          // expect(wrapper.vm.showReferenceHint).toBe(true);
          // expect(wrapper.find({ ref: 'duration' }).exists()).toBe(false);
        });
      });
    });
  });

  describe(`duration dropdown`, () => {
    it(`renders the duration dropdown`, () => {
      const wrapper = mount(CompletionOptions);
      const dropdown = wrapper.find({ ref: 'duration' });
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
        expect(wrapper.vm.durationDropdown).toBe('exactTime');
      });
      it(`duration dropdown is empty by default for documents`, () => {
        const wrapper = mount(CompletionOptions, {
          propsData: {
            kind: 'document',
            value: { suggested_duration: null },
          },
        });
        expect(wrapper.vm.durationDropdown).toBe('');
      });
      it(`duration dropdown is empty by default for exercises`, () => {
        const wrapper = mount(CompletionOptions, {
          propsData: {
            kind: 'exercise',
            value: { suggested_duration: null },
          },
        });
        expect(wrapper.vm.durationDropdown).toBe('');
      });
      it(`duration dropdown is empty by default for html5`, () => {
        const wrapper = mount(CompletionOptions, {
          propsData: {
            kind: 'html5',
            value: { suggested_duration: null },
          },
        });
        expect(wrapper.vm.durationDropdown).toBe('');
      });
      it(`duration dropdown is hidden by default for h5p`, () => {
        const wrapper = mount(CompletionOptions, {
          propsData: {
            kind: 'h5p',
            value: { suggested_duration: null },
          },
        });
        const dropdown = wrapper.find({ ref: 'duration' });
        expect(dropdown.exists()).toBe(false);
      });
    });
    describe(`when completion dropdown is 'Complete duration'`, () => {
      describe('emitted events', () => {
        it('input should be emitted when duration dropdown is updated', async () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'document',
              value: { model: null },
            },
          });
          wrapper.find({ ref: 'duration' }).vm.$emit('input', 'shortActivity');
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
          wrapper.find({ ref: 'duration' }).vm.$emit('input', 'shortActivity');
          await wrapper.vm.$nextTick();
          expect(wrapper.find({ ref: 'activity_duration' }).exists()).toBe(true);
          expect(wrapper.vm.showActivityDurationInput).toBe(true);
        });
        it(`minutes input is displayed when 'Long activity' is selected`, async () => {
          const wrapper = mount(CompletionOptions, {
            propsData: {
              kind: 'audio',
              value: { model: null },
            },
          });
          wrapper.find({ ref: 'duration' }).vm.$emit('input', 'longActivity');
          await wrapper.vm.$nextTick();
          expect(wrapper.find({ ref: 'activity_duration' }).exists()).toBe(true);
          expect(wrapper.vm.showActivityDurationInput).toBe(true);
        });
      });
      describe(`document`, () => {
        describe(`'All content viewed' is selected as completion`, () => {
          it(`minutes input is displayed when 'Short activity' is selected`, async () => {
            const wrapper = mount(CompletionOptions, {
              propsData: {
                kind: 'document',
                value: { model: 'pages' },
              },
            });
            wrapper.find({ ref: 'duration' }).vm.$emit('input', 'shortActivity');
            await wrapper.vm.$nextTick();
            expect(wrapper.find({ ref: 'activity_duration' }).exists()).toBe(true);
            expect(wrapper.vm.showActivityDurationInput).toBe(true);
          });
          it(`minutes input is displayed when 'Long activity' is selected`, async () => {
            const wrapper = mount(CompletionOptions, {
              propsData: {
                kind: 'document',
                value: { model: 'pages' },
              },
            });
            wrapper.find({ ref: 'duration' }).vm.$emit('input', 'longActivity');
            await wrapper.vm.$nextTick();
            expect(wrapper.find({ ref: 'activity_duration' }).exists()).toBe(true);
            expect(wrapper.vm.showActivityDurationInput).toBe(true);
          });
          it(`minutes input is displayed when 'Exact time' is selected`, async () => {
            const wrapper = mount(CompletionOptions, {
              propsData: {
                kind: 'document',
                value: { model: 'pages' },
              },
            });
            wrapper.find({ ref: 'duration' }).vm.$emit('input', 'exactTime');
            await wrapper.vm.$nextTick();
            expect(wrapper.find({ ref: 'activity_duration' }).exists()).toBe(true);
            expect(wrapper.vm.showActivityDurationInput).toBe(true);
          });
          it(`minutes input is hidden and reference hint is displayed when 'Reference' is selected`, () => {
            const wrapper = mount(CompletionOptions, {
              propsData: {
                kind: 'document',
                value: { model: 'reference' },
              },
            });
            // wrapper.find({ ref: 'completion' }).vm.$emit('input', 'allContent');
            // wrapper.find({ ref: 'duration' }).vm.$emit('input',
            //   {
            //     completion_criteria: { model: 'reference', threshold: null },
            //     suggested_duration: NaN,
            //     suggested_duration_type: 'approx_time',
            //     modality: undefined
            //   }
            // );

            expect(wrapper.find({ ref: 'activity_duration' }).exists()).toBe(false);
            expect(wrapper.vm.showActivityDurationInput).toBe(false);
            expect(wrapper.vm.showReferenceHint).toBe(true);
          });
        });
        describe(`'Complete duration' is selected as completion`, () => {
          it(`.... when 'Short activity' is selected`, () => {});
          it(`.... when 'Long activity' is selected`, () => {});
          it(`.... when 'Exact time' is selected`, () => {});
          it(`.... when 'Reference' is selected`, () => {});
        });
        describe(`Switching between 'All content viewed' and 'Complete duration'`, () => {
          it(`.... when switching betweeen 'Short activity' in ACV and CD`, () => {});
          it(`.... when switching betweeen 'Long activity' in ACV and CD`, () => {});
          it(`.... when switching betweeen 'Exact time' in ACV and CD`, () => {});
          it(`.... when switching betweeen 'Reference' in ACV and CD`, () => {});
        });
      });
      describe(`exercise`, () => {});
      describe(`html5 or h5p`, () => {});
      it(`model and suggested_duration_type should be 'approx_time' when duration dropdown is 'Short activity'`, () => {
        //done
      });
      it(`model and suggested_duration_type should be 'approx_time' when duration dropdown is 'Long activity'`, () => {
        //done
      });
      it(`model and suggested_duration_type should be 'time' when duration dropdown is 'Exact time'`, () => {
        //done
      });
    });
    xdescribe(`when completion dropdown is 'All content viewed'`, () => {
      it(`model should be 'pages' and suggested_duration_type should be 'approx_time' when duration dropdown is 'Short activity'`, () => {
        //done
      });
      it(`model should be 'pages' and suggested_duration_type should be 'approx_time' when duration dropdown is 'Long activity'`, () => {
        //done
      });
      it(`model should be 'pages' and suggested_duration_type should be 'time' when duration dropdown is 'Exact time'`, () => {
        //done
      });
      it(`model should be 'reference' when duration dropdown is 'Reference'`, () => {
        //done
      });
    });
    xdescribe(`when completion dropdown is 'Practice quiz'`, () => {
      it(`'Goal' dropdown is removed`, () => {
        //done
      });
    });
    xdescribe(`when completion dropdown is 'Practice until goal is met'`, () => {
      it(``, () => {});
      it(``, () => {});
      it(``, () => {});
    });
    xdescribe(`when completion dropdown is 'Determined by this resource'`, () => {});
  });
  xdescribe(`minutes input`, () => {
    //Note: while the component itself is in another component,
    //the logic to get the data ready for the BE is in this component
    //test for the initial state (does it show or not show) when you click on resources
    describe(`in 'Short activity'`, () => {
      it(`should increment by 5-minute intervals`, () => {
        // const wrapper = mount(ActivityDuration, {
        //   propsData: {
        //     selectedDuration: 'longActivity',
        //   },
        // });
        // expect(wrapper.html()).toContain(`step="5"`);
        // expect(wrapper.html()).not.toContain(`step="10"`);
      });
      it(`should round to the nearest 5-minute`, () => {
        // const wrapper = mount(ActivityDuration);
      });
      it(`minimum accepted input should be 5 minutes`, () => {});
      it(`maximum accepted input should be 30 minutes`, () => {});
    });

    xdescribe(`default states`, () => {
      it(`time from file should be displayed when duration dropdown is 'Exact time to complete'`, () => {
        //done
      });
      it(`minutes input should not be displayed for documents`, () => {
        //done
      });
      it(`duration dropdown is empty by default for exercises`, () => {
        //done
      });
      it(`duration dropdown is empty by default for html5 or h5p`, () => {});
    });
    xdescribe(`displayed states`, () => {
      it(`'Reference' should be displayed if the model is 'reference'`, () => {});
      it(`'Exact time' should be displayed if the 'suggested_duration_type' is 'exact time'`, () => {});
      it(`'Short activity' should be displayed if the 'suggested_duration_type' is 'approx_time' and 'suggested_duration' is less than the midpoint`, () => {});
      it(`'Long activity' should be displayed if the 'suggested_duration_type' is 'approx_time' and 'suggested_duration' is greater than the midpoint`, () => {});
    });

    xdescribe(`when completion dropdown is 'Complete duration'`, () => {
      it(`model and suggested_duration_type should be 'approx_time' when duration dropdown is 'Short activity'`, () => {});
      it(`model and suggested_duration_type should be 'approx_time' when duration dropdown is 'Long activity'`, () => {});
      it(`model and suggested_duration_type should be 'time' when duration dropdown is 'Exact time'`, () => {});
    });
    xdescribe(`when completion dropdown is 'All content viewed'`, () => {
      it(`model should be 'pages' and suggested_duration_type should be 'approx_time' when duration dropdown is 'Short activity'`, () => {});
      it(`model should be 'pages' and suggested_duration_type should be 'approx_time' when duration dropdown is 'Long activity'`, () => {});
      it(`model should be 'pages' and suggested_duration_type should be 'time' when duration dropdown is 'Exact time'`, () => {});
      it(`model should be 'reference' when duration dropdown is 'Reference'`, () => {});
    });
    xdescribe(`when completion dropdown is 'Practice quiz'`, () => {});
    xdescribe(`when completion dropdown is 'Practice until goal is met'`, () => {});
    xdescribe(`when completion dropdown is 'Determined by this resource'`, () => {});
  });
});
