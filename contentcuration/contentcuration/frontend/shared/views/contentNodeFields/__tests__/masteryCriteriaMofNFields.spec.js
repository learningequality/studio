import { mount } from '@vue/test-utils';
import MasteryCriteriaMofNFields from '../CompletionOptions/MasteryCriteriaMofNFields';
import TestForm from 'shared/views/__tests__/TestForm';

document.body.setAttribute('data-app', true); // Vuetify prints a warning without this

describe('MasteryCriteriaMofNFields', () => {});
function makeWrapper() {
  return mount(TestForm, {
    slots: {
      testComponent: MasteryCriteriaMofNFields,
    },
  });
}

describe('masteryCriteriaMofNFields', () => {
  let formWrapper;
  let wrapper;
  let mInput;
  let nInput;

  beforeEach(() => {
    formWrapper = makeWrapper();
    wrapper = formWrapper.find(MasteryCriteriaMofNFields);
    wrapper.setProps({ showMofN: true });
    wrapper.setProps({ value: { mastery_model: 'm_of_n' } });
    wrapper.vm.$nextTick(() => {
      mInput = wrapper.find({ ref: 'mValue' }).find('input');
      nInput = wrapper.find({ ref: 'nValue' }).find('input');
    });
  });

  describe('on load', () => {
    it('should render according to masteryModel prop', () => {
      const model = 'm_of_n';
      expect(wrapper.find({ ref: 'mValue' }).exists()).toBe(model === 'm_of_n');
      expect(wrapper.find({ ref: 'nValue' }).exists()).toBe(model === 'm_of_n');
    });
    it('should render correct mValue and nValue props', () => {
      wrapper.setProps({ value: { m: 10, n: 20 } });
      return wrapper.vm.$nextTick(() => {
        expect(wrapper.vm.$refs.mValue.value).toEqual(10);
        expect(wrapper.vm.$refs.nValue.value).toEqual(20);
      });
    });
  });
  describe('props', () => {
    beforeEach(() => {});
    it('setting readonly should prevent any edits', () => {
      wrapper.setProps({ readonly: true });
      return wrapper.vm.$nextTick(() => {
        expect(mInput.attributes('readonly')).toEqual('readonly');
        expect(nInput.attributes('readonly')).toEqual('readonly');
      });
    });
    it('setting required to false should make fields not required (required by default)', () => {
      expect(mInput.attributes('required')).toEqual('required');
      expect(nInput.attributes('required')).toEqual('required');

      wrapper.setProps({ mRequired: false, nRequired: false });
      return wrapper.vm.$nextTick(() => {
        expect(mInput.attributes('required')).toBeFalsy();
        expect(nInput.attributes('required')).toBeFalsy();
      });
    });
    it('setting disabled should make fields disabled', () => {
      expect(mInput.attributes('disabled')).toBeFalsy();
      expect(nInput.attributes('disabled')).toBeFalsy();

      wrapper.setProps({ disabled: true });
      return wrapper.vm.$nextTick(() => {
        expect(mInput.attributes('disabled')).toEqual('disabled');
        expect(nInput.attributes('disabled')).toEqual('disabled');
      });
    });
  });
  describe('emitted events', () => {
    it('input should be emitted when mValue is updated', () => {
      expect(wrapper.emitted('input')).toBeFalsy();
      mInput.setValue(10);
      expect(wrapper.emitted('input')).toBeTruthy();
      expect(wrapper.emitted('input')[0][0].m).toEqual(10);
    });
    it('input should be emitted when nValue is updated', () => {
      expect(wrapper.emitted('input')).toBeFalsy();
      nInput.setValue(10);
      expect(wrapper.emitted('input')).toBeTruthy();
      expect(wrapper.emitted('input')[0][0].n).toEqual(10);
    });
  });
  describe('validation', () => {
    it('should flag empty n and m values', () => {
      formWrapper.vm.validate();
      expect(wrapper.find({ ref: 'mValue' }).find('.error--text').exists()).toBe(true);
      expect(wrapper.find({ ref: 'nValue' }).find('.error--text').exists()).toBe(true);
      wrapper.setProps({ mRequired: false, nRequired: false });
      formWrapper.vm.validate();
      expect(wrapper.find({ ref: 'mValue' }).find('.error--text').exists()).toBe(false);
      expect(wrapper.find({ ref: 'nValue' }).find('.error--text').exists()).toBe(false);
    });
    it('should flag if m is not a whole number', () => {
      wrapper.setProps({ value: { mastery_model: 'm_of_n', m: 0.1231, n: 10 } });
      formWrapper.vm.validate();
      expect(wrapper.find({ ref: 'mValue' }).find('.error--text').exists()).toBe(true);
      wrapper.setProps({ value: { mastery_model: 'm_of_n', m: 1, n: 10 } });
      formWrapper.vm.validate();
      expect(wrapper.find({ ref: 'mValue' }).find('.error--text').exists()).toBe(false);
    });
    it('should flag if m < 1', () => {
      wrapper.setProps({ value: { mastery_model: 'm_of_n', m: 0, n: 10 } });
      formWrapper.vm.validate();
      expect(wrapper.find({ ref: 'mValue' }).find('.error--text').exists()).toBe(true);
      wrapper.setProps({ value: { mastery_model: 'm_of_n', m: 1, n: 10 } });
      formWrapper.vm.validate();
      expect(wrapper.find({ ref: 'mValue' }).find('.error--text').exists()).toBe(false);
    });
    it('should flag if m > n', () => {
      wrapper.setProps({ value: { mastery_model: 'm_of_n', m: 2, n: 1 } });
      formWrapper.vm.validate();
      expect(wrapper.find({ ref: 'mValue' }).find('.error--text').exists()).toBe(true);
      wrapper.setProps({ value: { mastery_model: 'm_of_n', m: 2, n: 2 } });
      formWrapper.vm.validate();
      expect(wrapper.find({ ref: 'mValue' }).find('.error--text').exists()).toBe(false);
    });
  });
});
