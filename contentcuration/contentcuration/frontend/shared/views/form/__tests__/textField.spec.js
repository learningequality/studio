import { mount } from '@vue/test-utils';
import TextField from '../TextField.vue';

function makeWrapper() {
  return mount(TextField);
}

function runValidation(wrapper, value) {
  return wrapper.vm.rules.every(rule => rule(value) === true);
}

describe('textField', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  it('should validate empty fields', () => {
    expect(runValidation(wrapper, '')).toBe(false);
    expect(runValidation(wrapper, ' ')).toBe(false);
    expect(runValidation(wrapper, 'text')).toBe(true);
  });
  it('should validate additionalRules', () => {
    wrapper.setProps({
      additionalRules: () => false,
    });
    expect(runValidation(wrapper, 'text')).toBe(false);
  });
});
