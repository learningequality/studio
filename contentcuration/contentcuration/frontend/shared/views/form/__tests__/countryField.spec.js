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

window.languageCode = 'en';
describe('countryField', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  it('should validate if no selections are made', () => {
    expect(runValidation(wrapper, [])).toBe(false);
    expect(runValidation(wrapper, ['item'])).toBe(true);
  });
});
