import { mount } from '@vue/test-utils';
import TextField from '../TextField.vue';

function makeWrapper() {
  return mount(TextField);
}

function runValidation(wrapper, value) {
  return wrapper.vm.rules.every(rule => rule(value) === true);
}

describe('passwordField', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  it('should validate empty fields', () => {
    expect(runValidation(wrapper, '')).toBe(false);
    expect(runValidation(wrapper, 'pass')).toBe(true);
  });
  it('should validate additionalRules', async () => {
    wrapper.setProps({
      additionalRules: () => false,
    });
    await wrapper.vm.$nextTick();
    expect(runValidation(wrapper, 'pass')).toBe(false);
  });
});
