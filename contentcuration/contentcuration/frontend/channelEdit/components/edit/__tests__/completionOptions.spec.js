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
      describe(`audio or video`, () => {
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
    xdescribe(`displayed states`, () => {
      it(`'Reference' should be displayed if the model is 'reference'`, () => {
        //done
      });
      it(`'Exact time' should be displayed if the 'suggested_duration_type' is 'exact time'`, () => {
        //done
      });
      it(`'Short activity' should be displayed if the 'suggested_duration_type' is 'approx_time' and 'suggested_duration' is less than the midpoint`, () => {
        //done
      });
      it(`'Long activity' should be displayed if the 'suggested_duration_type' is 'approx_time' and 'suggested_duration' is greater than the midpoint`, () => {
        //done
      });
    });
    xdescribe(`when completion dropdown is 'Complete duration'`, () => {
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
