import Vue from 'vue';
import Vuetify from 'vuetify';
import { mount } from '@vue/test-utils';
import ContentNodeLearningActivityIcon from '../ContentNodeLearningActivityIcon.vue';

Vue.use(Vuetify);

document.body.setAttribute('data-app', true); // Vuetify prints a warning without this

describe('ContentNodeLearningActivityIcon', () => {
  let wrapper;
  describe('labeled icons', () => {
    wrapper = mount(ContentNodeLearningActivityIcon, {
      propsData: {
        learningActivities: {
          '#j8L0eq3': true,
        },
        includeText: true,
        chip: false,
      },
    });
    it('should display a KLabeledIcon for each activity if includeText is true', () => {
      expect(wrapper.find('[data-test="labeled-icon"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="icon-only"]').exists()).toBe(false);
    });
  });
  describe('icon only', () => {
    it('if there is only one learning activity, it should display the KIcon', () => {
      wrapper = mount(ContentNodeLearningActivityIcon, {
        propsData: {
          learningActivities: {
            '#j8L0eq3': true,
          },
          includeText: false,
          chip: false,
        },
      });
      expect(wrapper.find('[data-test="icon-only"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="labeled-icon"]').exists()).toBe(false);
    });
    describe('when there is more than one learning activity', () => {
      it('if showEachActivityIcon is true, it should show a KIcon for each learning activity', () => {
        wrapper = mount(ContentNodeLearningActivityIcon, {
          propsData: {
            learningActivities: {
              '#j8L0eq3': true,
              UXADWcXZ: true,
            },
            includeText: false,
            showEachActivityIcon: true,
          },
        });
        expect(wrapper.find('[data-test="multiple-activities-icon"]').exists()).toBe(false);
        expect(wrapper.find('[data-test="icon-only"]').exists()).toBe(true);
      });
    });
    it('if showEachActivityIcon is false, it should show only the multipleLearningActivity KIcon', () => {
      wrapper = mount(ContentNodeLearningActivityIcon, {
        propsData: {
          learningActivities: {
            '#j8L0eq3': true,
            UXADWcXZ: true,
          },
          includeText: false,
          showEachActivityIcon: false,
        },
      });
      expect(wrapper.find('[data-test="multiple-activities-icon"]').exists()).toBe(true);
    });
  });
});
