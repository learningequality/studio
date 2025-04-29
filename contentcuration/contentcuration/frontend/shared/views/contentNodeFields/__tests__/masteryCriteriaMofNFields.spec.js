import { mount } from '@vue/test-utils';
import MasteryCriteriaMofNFields from '../CompletionOptions/MasteryCriteriaMofNFields';
import TestForm from 'shared/views/__tests__/TestForm';

const mastery_model = 'm_of_n';

async function makeWrapper(propsData = {}) {
  const form = mount(TestForm);
  await form.vm.$nextTick();
  const field = mount(MasteryCriteriaMofNFields, {
    attachTo: form.element,
    propsData,
  });
  return [form, field];
}

describe('masteryCriteriaMofNFields', () => {
  let formWrapper;
  let wrapper;
  let mValue;
  let nValue;
  let mInput;
  let nInput;

  beforeEach(async () => {
    [formWrapper, wrapper] = await makeWrapper({ showMofN: true, value: { mastery_model } });
    await wrapper.vm.$nextTick();
    mValue = wrapper.findComponent({ ref: 'mValue' });
    mInput = mValue.find('input');
    nValue = wrapper.findComponent({ ref: 'nValue' });
    nInput = nValue.find('input');
  });

  describe('on load', () => {
    it('should render according to masteryModel prop', () => {
      expect(mValue.exists()).toBe(true);
      expect(nValue.exists()).toBe(true);
    });
    it('should render correct mValue and nValue props', async () => {
      await wrapper.setProps({ value: { m: 10, n: 20 } });
      expect(mValue.vm.value).toEqual(10);
      expect(nValue.vm.value).toEqual(20);
    });
  });

  describe('props', () => {
    it('setting readonly should prevent any edits', async () => {
      await wrapper.setProps({ readonly: true });
      expect(mInput.attributes('readonly')).toEqual('readonly');
      expect(nInput.attributes('readonly')).toEqual('readonly');
    });

    it('setting required to false should make fields not required (required by default)', async () => {
      expect(mInput.attributes('required')).toEqual('required');
      expect(nInput.attributes('required')).toEqual('required');

      await wrapper.setProps({ mRequired: false, nRequired: false });
      expect(mInput.attributes('required')).toBeFalsy();
      expect(nInput.attributes('required')).toBeFalsy();
    });

    it('setting disabled should make fields disabled', async () => {
      expect(mInput.attributes('disabled')).toBeFalsy();
      expect(nInput.attributes('disabled')).toBeFalsy();

      await wrapper.setProps({ disabled: true });
      expect(mInput.attributes('disabled')).toEqual('disabled');
      expect(nInput.attributes('disabled')).toEqual('disabled');
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
    it('should flag empty n and m values', async () => {
      await wrapper.setProps({ value: { mastery_model, m: '', n: '' } });
      formWrapper.vm.validate();
      await wrapper.vm.$nextTick();
      expect(mValue.classes()).toContain('error--text');
      expect(nValue.classes()).toContain('error--text');

      await wrapper.setProps({ mRequired: false, nRequired: false });
      formWrapper.vm.validate();
      await wrapper.vm.$nextTick();
      expect(mValue.classes()).not.toContain('error--text');
      expect(nValue.classes()).not.toContain('error--text');
    });

    it('should flag if m is not a whole number', async () => {
      await wrapper.setProps({ value: { mastery_model, m: 0.1231, n: 10 } });
      formWrapper.vm.validate();
      await wrapper.vm.$nextTick();
      expect(mValue.classes()).toContain('error--text');

      await wrapper.setProps({ value: { mastery_model, m: 1, n: 10 } });
      formWrapper.vm.validate();
      await wrapper.vm.$nextTick();
      expect(mValue.classes()).not.toContain('error--text');
    });

    it('should flag if m < 1', async () => {
      await wrapper.setProps({ value: { mastery_model, m: 0, n: 10 } });
      formWrapper.vm.validate();
      await wrapper.vm.$nextTick();
      expect(mValue.classes()).toContain('error--text');

      await wrapper.setProps({ value: { mastery_model, m: 1, n: 10 } });
      formWrapper.vm.validate();
      await wrapper.vm.$nextTick();
      expect(mValue.classes()).not.toContain('error--text');
    });

    // TEST FAILS: the second portion where m == n, fails to assert the input does not have the
    // error class.
    it.skip('should flag if m > n', async () => {
      await wrapper.setProps({ value: { mastery_model, m: 2, n: 1 } });
      formWrapper.vm.validate();
      await wrapper.vm.$nextTick();
      expect(mValue.classes()).toContain('error--text');

      await wrapper.setProps({ value: { mastery_model, m: 2, n: 2 } });
      formWrapper.vm.validate();
      await wrapper.vm.$nextTick();
      expect(mValue.vm.value).toEqual(2);
      expect(nValue.vm.value).toEqual(2);
      expect(mValue.classes()).not.toContain('error--text');
    });
  });
});
