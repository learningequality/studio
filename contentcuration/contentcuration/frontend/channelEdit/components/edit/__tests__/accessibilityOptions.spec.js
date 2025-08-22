import { shallowMount, mount } from '@vue/test-utils';
import AccessibilityOptions from '../AccessibilityOptions.vue';

describe('AccessibilityOptions', () => {
  it('smoke test', () => {
    const wrapper = shallowMount(AccessibilityOptions, {
      propsData: {
        kind: 'document',
      },
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('should display the correct list of accessibility options if resource is a document', () => {
    const wrapper = mount(AccessibilityOptions, {
      propsData: {
        kind: 'document',
      },
    });

    expect(wrapper.findComponent('[data-test="checkbox-altText"]').exists()).toBe(true);
    expect(wrapper.findComponent('[data-test="checkbox-highContrast"]').exists()).toBe(true);
    expect(wrapper.findComponent('[data-test="checkbox-taggedPdf"]').exists()).toBe(true);
    expect(wrapper.findComponent('[data-test="checkbox-signLanguage"]').exists()).toBe(false);
    expect(wrapper.findComponent('[data-test="checkbox-audioDescription"]').exists()).toBe(false);
  });

  it('should display the correct list of accessibility options if resource is a video', () => {
    const wrapper = mount(AccessibilityOptions, {
      propsData: {
        kind: 'video',
      },
    });

    expect(wrapper.findComponent('[data-test="checkbox-altText"]').exists()).toBe(false);
    expect(wrapper.findComponent('[data-test="checkbox-highContrast"]').exists()).toBe(false);
    expect(wrapper.findComponent('[data-test="checkbox-taggedPdf"]').exists()).toBe(false);
    expect(wrapper.findComponent('[data-test="checkbox-signLanguage"]').exists()).toBe(true);
    expect(wrapper.findComponent('[data-test="checkbox-audioDescription"]').exists()).toBe(true);
    expect(wrapper.findComponent('[data-test="checkbox-captionsSubtitles"]').exists()).toBe(true);
    expect(wrapper.findComponent('[data-test="tooltip-captionsSubtitles"]').exists()).toBe(false);
  });

  it('should display the correct list of accessibility options if resource is an exercise/practice', () => {
    const wrapper = mount(AccessibilityOptions, {
      propsData: {
        kind: 'exercise',
      },
    });

    expect(wrapper.findComponent('[data-test="checkbox-altText"]').exists()).toBe(true);
    expect(wrapper.findComponent('[data-test="checkbox-highContrast"]').exists()).toBe(false);
    expect(wrapper.findComponent('[data-test="checkbox-taggedPdf"]').exists()).toBe(false);
    expect(wrapper.findComponent('[data-test="checkbox-signLanguage"]').exists()).toBe(false);
    expect(wrapper.findComponent('[data-test="checkbox-audioDescription"]').exists()).toBe(false);
  });

  it('should display the correct list of accessibility options if resource is html5/zip', () => {
    const wrapper = mount(AccessibilityOptions, {
      propsData: {
        kind: 'html5',
      },
    });

    expect(wrapper.findComponent('[data-test="checkbox-altText"]').exists()).toBe(true);
    expect(wrapper.findComponent('[data-test="checkbox-highContrast"]').exists()).toBe(true);
    expect(wrapper.findComponent('[data-test="checkbox-taggedPdf"]').exists()).toBe(false);
    expect(wrapper.findComponent('[data-test="checkbox-signLanguage"]').exists()).toBe(false);
    expect(wrapper.findComponent('[data-test="checkbox-audioDescription"]').exists()).toBe(false);
  });

  it('should display the correct list of accessibility options if resource is an audio', () => {
    const wrapper = mount(AccessibilityOptions, {
      propsData: {
        kind: 'audio',
      },
    });

    expect(wrapper.findComponent('[data-test="checkbox-captionsSubtitles"]').exists()).toBe(true);
    expect(wrapper.findComponent('[data-test="tooltip-captionsSubtitles"]').exists()).toBe(false);
  });

  it('should render appropriate tooltips along with the checkbox', () => {
    const wrapper = mount(AccessibilityOptions, {
      propsData: {
        kind: 'document',
      },
    });

    expect(wrapper.findComponent('[data-test="checkbox-altText"]').exists()).toBe(true);
    expect(wrapper.findComponent('[data-test="tooltip-altText"]').exists()).toBe(true);
    expect(wrapper.findComponent('[data-test="checkbox-highContrast"]').exists()).toBe(true);
    expect(wrapper.findComponent('[data-test="tooltip-highContrast"]').exists()).toBe(true);
    expect(wrapper.findComponent('[data-test="checkbox-taggedPdf"]').exists()).toBe(true);
    expect(wrapper.findComponent('[data-test="tooltip-taggedPdf"]').exists()).toBe(true);
    expect(wrapper.findComponent('[data-test="checkbox-signLanguage"]').exists()).toBe(false);
    expect(wrapper.findComponent('[data-test="tooltip-signLanguage"]').exists()).toBe(false);
    expect(wrapper.findComponent('[data-test="checkbox-audioDescription"]').exists()).toBe(false);
    expect(wrapper.findComponent('[data-test="tooltip-audioDescription"]').exists()).toBe(false);
  });
});
