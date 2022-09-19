import Vue from 'vue';
import Vuetify from 'vuetify';
import { shallowMount, mount } from '@vue/test-utils';
import AccessibilityOptions from '../AccessibilityOptions.vue';

Vue.use(Vuetify);

describe('AccessibilityOptions', () => {
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

    expect(
      wrapper.find('[data-test="checkbox-Has alternative text description for images"]').exists()
    ).toBe(true);
    expect(
      wrapper.find('[data-test="checkbox-Has high contrast display for low vision"]').exists()
    ).toBe(true);
    expect(wrapper.find('[data-test="checkbox-Tagged PDF"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="checkbox-Has sign language captions"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="checkbox-Has audio descriptions"]').exists()).toBe(false);
  });

  it('should display the correct list of accessibility options if resource is a video', () => {
    const wrapper = mount(AccessibilityOptions, {
      propsData: {
        kind: 'video',
      },
    });

    expect(
      wrapper.find('[data-test="checkbox-Has alternative text description for images"]').exists()
    ).toBe(false);
    expect(
      wrapper.find('[data-test="checkbox-Has high contrast display for low vision"]').exists()
    ).toBe(false);
    expect(wrapper.find('[data-test="checkbox-Tagged PDF"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="checkbox-Has sign language captions"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="checkbox-Has audio descriptions"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="checkbox-Has captions or subtitles"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="tooltip-Has captions or subtitles"]').exists()).toBe(false);
  });

  it('should display the correct list of accessibility options if resource is an exercise/practice', () => {
    const wrapper = mount(AccessibilityOptions, {
      propsData: {
        kind: 'exercise',
      },
    });

    expect(
      wrapper.find('[data-test="checkbox-Has alternative text description for images"]').exists()
    ).toBe(true);
    expect(
      wrapper.find('[data-test="checkbox-Has high contrast display for low vision"]').exists()
    ).toBe(false);
    expect(wrapper.find('[data-test="checkbox-Tagged PDF"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="checkbox-Has sign language captions"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="checkbox-Has audio descriptions"]').exists()).toBe(false);
  });

  it('should display the correct list of accessibility options if resource is html5/zip', () => {
    const wrapper = mount(AccessibilityOptions, {
      propsData: {
        kind: 'html5',
      },
    });

    expect(
      wrapper.find('[data-test="checkbox-Has alternative text description for images"]').exists()
    ).toBe(true);
    expect(
      wrapper.find('[data-test="checkbox-Has high contrast display for low vision"]').exists()
    ).toBe(true);
    expect(wrapper.find('[data-test="checkbox-Tagged PDF"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="checkbox-Has sign language captions"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="checkbox-Has audio descriptions"]').exists()).toBe(false);
  });

  it('should render appropriate tooltips along with the checkbox', () => {
    const wrapper = mount(AccessibilityOptions, {
      propsData: {
        kind: 'document',
      },
    });

    expect(
      wrapper.find('[data-test="checkbox-Has alternative text description for images"]').exists()
    ).toBe(true);
    expect(
      wrapper.find('[data-test="tooltip-Has alternative text description for images"]').exists()
    ).toBe(true);
    expect(
      wrapper.find('[data-test="checkbox-Has high contrast display for low vision"]').exists()
    ).toBe(true);
    expect(
      wrapper.find('[data-test="tooltip-Has high contrast display for low vision"]').exists()
    ).toBe(true);
    expect(wrapper.find('[data-test="checkbox-Tagged PDF"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="tooltip-Tagged PDF"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="checkbox-Has sign language captions"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="tooltip-Has sign language captions"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="checkbox-Has audio descriptions"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="tooltip-Has audio descriptions"]').exists()).toBe(false);
  });
});
