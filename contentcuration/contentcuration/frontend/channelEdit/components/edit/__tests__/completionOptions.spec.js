import Vue from 'vue';
import Vuetify from 'vuetify';
import { shallowMount, mount } from '@vue/test-utils';
import CompletionOptions from '../CompletionOptions.vue';

Vue.use(Vuetify);

describe('CompletionOptions', () => {
  it('smoke test', () => {
    const wrapper = shallowMount(CompletionOptions, {
      propsData: {
        kind: 'document',
      },
    });
    expect(wrapper.isVueInstance()).toBe(true);
  });

  describe(`completion dropdown`, () => {
    describe(`audio or video`, () => {
      it(`'Complete duration' should be displayed by default`, () => {
        //done
      });
      it(`'Complete duration' should be displayed if the model in the backend is 'exact time', 'short activity', or 'long activity'`, () => {
        //done
      });
      it(`'Reference' should be displayed if the model in the backend is 'reference'`, () => {
        //done
      });
    });
    describe(`document`, () => {
      it(`'All content viewed' should be displayed by default`, () => {
        //done
      });
      it(`'All content viewed' should be displayed if the model in the backend is 'reference' or 'pages'`, () => {
        //done
      });
      it(`'Complete duration' should be displayed if the model in the backend is 'exact time', 'short activity', or 'long activity'`, () => {
        //done
      });
    });
    describe(`exercise`, () => {
      it(`'Practice until goal is met' should be displayed by default if 'practice quiz' is enabled `, () => {});
      it(`'Practice quiz' should be displayed if 'practice quiz' is enabled`, () => {});
      it(`Completion dropdown should not be displayed if 'practice quiz' is not enabled`, () => {});
    });
    describe(`html5 or h5p`, () => {
      it(`'Complete duration' should be displayed by default for html5`, () => {
        //done
      });
      it(`'Complete duration' should be displayed if the model in the backend exists`, () => {
        //done
      });
      it(`'Determined by this resource' should be displayed if there is no model in the backend for h5p`, () => {});
    });
  });

  describe(`duration dropdown`, () => {
    describe(`default states`, () => {
      it(`'Exact time to complete' should be displayed by default for audio or video`, () => {
        //done
      });
      it(`duration dropdown is empty by default for documents`, () => {
        //done
      });
      it(`duration dropdown is empty by default for exercises`, () => {});
      it(`duration dropdown is empty by default for html5`, () => {
        //done
      });
      it(`duration dropdown is hidden by default for h5p`, () => {});
    });
    describe(`displayed states`, () => {
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
    describe(`when completion dropdown is 'Complete duration'`, () => {
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
    describe(`when completion dropdown is 'All content viewed'`, () => {
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
    describe(`when completion dropdown is 'Practice quiz'`, () => {});
    describe(`when completion dropdown is 'Practice until goal is met'`, () => {});
    describe(`when completion dropdown is 'Determined by this resource'`, () => {});
  });
  describe(`minutes input`, () => {
    describe(`default states`, () => {
      it(`time from file should be displayed when duration dropdown is 'Exact time to complete'`, () => {
        //done
      });
      it(`minutes input should not be displayed for documents`, () => {
        //done
      });
      it(`duration dropdown is empty by default for exercises`, () => {});
      it(`duration dropdown is empty by default for html5 or h5p`, () => {});
    });
    describe(`displayed states`, () => {
      it(`'Reference' should be displayed if the model is 'reference'`, () => {});
      it(`'Exact time' should be displayed if the 'suggested_duration_type' is 'exact time'`, () => {});
      it(`'Short activity' should be displayed if the 'suggested_duration_type' is 'approx_time' and 'suggested_duration' is less than the midpoint`, () => {});
      it(`'Long activity' should be displayed if the 'suggested_duration_type' is 'approx_time' and 'suggested_duration' is greater than the midpoint`, () => {});
    });

    describe(`when completion dropdown is 'Complete duration'`, () => {
      it(`model and suggested_duration_type should be 'approx_time' when duration dropdown is 'Short activity'`, () => {});
      it(`model and suggested_duration_type should be 'approx_time' when duration dropdown is 'Long activity'`, () => {});
      it(`model and suggested_duration_type should be 'time' when duration dropdown is 'Exact time'`, () => {});
    });
    describe(`when completion dropdown is 'All content viewed'`, () => {
      it(`model should be 'pages' and suggested_duration_type should be 'approx_time' when duration dropdown is 'Short activity'`, () => {});
      it(`model should be 'pages' and suggested_duration_type should be 'approx_time' when duration dropdown is 'Long activity'`, () => {});
      it(`model should be 'pages' and suggested_duration_type should be 'time' when duration dropdown is 'Exact time'`, () => {});
      it(`model should be 'reference' when duration dropdown is 'Reference'`, () => {});
    });
    describe(`when completion dropdown is 'Practice quiz'`, () => {});
    describe(`when completion dropdown is 'Practice until goal is met'`, () => {});
    describe(`when completion dropdown is 'Determined by this resource'`, () => {});
  });

});
