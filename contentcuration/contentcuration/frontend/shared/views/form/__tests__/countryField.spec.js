import { mount } from '@vue/test-utils';
import CountryField from '../CountryField.vue';

function makeWrapper() {
  return mount(CountryField, {
    propsData: {
      required: true,
    },
  });
}

function runValidation(wrapper, value) {
  return wrapper.vm.rules.every(rule => rule(value) === true);
}

describe('countryField', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  it('should validate if no selections are made', () => {
    expect(runValidation(wrapper, [])).toBe(false);
    expect(runValidation(wrapper, ['item'])).toBe(true);
  });

  it('in multiple selection mode, search input is cleared after selection', async () => {
    await wrapper.setProps({ multiple: true });

    const autocomplete = wrapper.findComponent({ name: 'VAutocomplete' });
    wrapper.vm.searchInput = 'Czech';

    // Handling selection change uses `setTimeout` so we need to fake the timer
    jest.useFakeTimers();
    autocomplete.vm.$emit('input', ['Czech Republic']);
    jest.runAllTimers();
    jest.useRealTimers();

    expect(wrapper.vm.searchInput).toBe('');
  });

  it('in single selection mode, search input is not cleared after selection', async () => {
    await wrapper.setProps({ multiple: false });

    const autocomplete = wrapper.findComponent({ name: 'VAutocomplete' });
    wrapper.vm.searchInput = 'Czech';

    // Handling selection change uses `setTimeout` so we need to fake the timer
    jest.useFakeTimers();
    autocomplete.vm.$emit('input', 'Czech Republic');
    jest.runAllTimers();
    jest.useRealTimers();

    expect(wrapper.vm.searchInput).not.toBe('');
  });
});
