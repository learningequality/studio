import { mount, shallowMount } from '@vue/test-utils';
import LanguageDropdown from '../LanguageDropdown.vue';
import TestForm from './TestForm.vue';
import { LanguagesList } from 'shared/leUtils/Languages';

function makeWrapper(required = false) {
  const form = mount(TestForm, {
    slots: {
      testComponent: `<LanguageDropdown :required="${String(required)}" />`,
    },
    stubs: {
      LanguageDropdown,
    },
  });
  const dropdown = form.findComponent(LanguageDropdown);
  return [form, dropdown];
}

const testLanguages = LanguagesList.slice(0, 10);

describe('languageDropdown', () => {
  let wrapper;
  let formWrapper;

  beforeEach(() => {
    [formWrapper, wrapper] = makeWrapper();
  });

  it.each(testLanguages)('updating language $id should emit input event', language => {
    expect(wrapper.emitted('input')).toBeFalsy();
    // It looks like v-autocomplete doesn't trigger correctly, so call
    // method directly until resolved
    wrapper.find('.v-autocomplete').vm.$emit('input', language.id);
    expect(wrapper.emitted('input')).toBeTruthy();
    expect(wrapper.emitted('input')[0][0]).toEqual(language.id);
  });

  it('setting readonly should prevent any edits', () => {
    expect(wrapper.find('input[readonly]').exists()).toBe(false);
    wrapper = mount(LanguageDropdown, {
      attrs: {
        readonly: true,
      },
    });
    expect(wrapper.find('input[readonly]').exists()).toBe(true);
  });

  it('setting required should make field required', async () => {
    expect(wrapper.find('input:required').exists()).toBe(false);
    [formWrapper, wrapper] = makeWrapper(true);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('input:required').exists()).toBe(true);
  });

  it('validation should catch empty required languages', async () => {
    formWrapper.vm.validate();
    expect(wrapper.find('.error--text').exists()).toBe(false);
    [formWrapper, wrapper] = makeWrapper(true);
    await wrapper.vm.$nextTick();
    formWrapper.vm.validate();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.error--text').exists()).toBe(true);
  });

  it('returns formatted language text when native_name is present', () => {
    const wrapper = shallowMount(LanguageDropdown, {
      mocks: {
        $tr: (key, params) => `${params.language} (${params.code})`,
      },
    });
    const item = { native_name: 'Español,Spanish', id: 'es' };
    expect(wrapper.vm.languageText(item)).toBe('Español (es)');
  });

  it('returns formatted language text when native_name is an empty string', () => {
    const wrapper = shallowMount(LanguageDropdown, {
      mocks: {
        $tr: (key, params) => `${params.language} (${params.code})`,
      },
    });
    const item = { native_name: '', id: 'de' };
    expect(wrapper.vm.languageText(item)).toBe(' (de)');
  });
});
