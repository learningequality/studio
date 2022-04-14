import Vue from 'vue';
import Vuetify from 'vuetify';
import { shallowMount, mount } from '@vue/test-utils';
import AccessibilityOptions from '../AccessibilityOptions.vue';

Vue.use(Vuetify);

describe('AccessibilityOptions', () => {;

  it('smoke test', () => {
      const wrapper = shallowMount(AccessibilityOptions, {
        propsData: {
          kind: 'document',
        },
      });
      expect(wrapper.isVueInstance()).toBe(true);
  });

  it('should display the correct list of accessibility options if resource is a document', () => {
    const wrapper = mount(AccessibilityOptions, {
      propsData: {
        kind: 'document',
      },
    });

    expect(wrapper.find('[aria-label="Has alternative text description for images"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Has high contrast display for low vision"').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Tagged PDF"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Has sign language captions"]').exists()).toBe(false);
    expect(wrapper.find('[aria-label="Has audio descriptions"]').exists()).toBe(false);
  });

  it('should display the correct list of accessibility options if resource is a video', () => {
    const wrapper = mount(AccessibilityOptions, {
      propsData: {
        kind: 'video',
      },
    });

    expect(wrapper.find('[aria-label="Has alternative text description for images"]').exists()).toBe(false);
    expect(wrapper.find('[aria-label="Has high contrast display for low vision"').exists()).toBe(false);
    expect(wrapper.find('[aria-label="Tagged PDF"]').exists()).toBe(false);
    expect(wrapper.find('[aria-label="Has sign language captions"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Has audio descriptions"]').exists()).toBe(true);
  });

  it('should display the correct list of accessibility options if resource is an exercise/practice', () => {
    const wrapper = mount(AccessibilityOptions, {
      propsData: {
        kind: 'exercise',
      },
    });

    expect(wrapper.find('[aria-label="Has alternative text description for images"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Has high contrast display for low vision"').exists()).toBe(false);
    expect(wrapper.find('[aria-label="Tagged PDF"]').exists()).toBe(false);
    expect(wrapper.find('[aria-label="Has sign language captions"]').exists()).toBe(false);
    expect(wrapper.find('[aria-label="Has audio descriptions"]').exists()).toBe(false);
  });

  it('should display the correct list of accessibility options if resource is html5/zip', () => {
    const wrapper = mount(AccessibilityOptions, {
      propsData: {
        kind: 'html5',
      },
    });

    expect(wrapper.find('[aria-label="Has alternative text description for images"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Has high contrast display for low vision"').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Tagged PDF"]').exists()).toBe(false);
    expect(wrapper.find('[aria-label="Has sign language captions"]').exists()).toBe(false);
    expect(wrapper.find('[aria-label="Has audio descriptions"]').exists()).toBe(false);
  });

  it('should display tooltip', () => {
    const wrapper = mount(AccessibilityOptions, {
      propsData: {
        kind: 'document',
      },
    });

    expect(wrapper.find('[data-test="accessibility-tooltip"]').exists()).toBe(true);
  });

});
