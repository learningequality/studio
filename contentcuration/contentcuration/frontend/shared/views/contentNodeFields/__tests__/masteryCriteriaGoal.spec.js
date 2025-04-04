import { mount } from '@vue/test-utils';
import MasteryCriteriaGoal from '../CompletionOptions/MasteryCriteriaGoal';
import TestForm from 'shared/views/__tests__/TestForm';
import { constantStrings } from 'shared/mixins';
import MasteryModels from 'shared/leUtils/MasteryModels';

describe('MasteryCriteriaGoal', () => {});
async function makeWrapper(propsData = {}) {
  const form = mount(TestForm);
  await form.vm.$nextTick();
  const field = mount(MasteryCriteriaGoal, {
    attachTo: form.element,
    propsData,
  });
  return [form, field];
}

describe('masteryCriteriaGoal', () => {
  let formWrapper;
  let wrapper;
  let modelInput;

  beforeEach(async () => {
    [formWrapper, wrapper] = await makeWrapper();
    await wrapper.setProps({ value: 'm_of_n' });
    modelInput = wrapper.findComponent({ ref: 'masteryModel' }).find('input');
  });

  describe('on load', () => {
    MasteryModels.forEach(model => {
      it(`${model} mastery option should be an option to select`, () => {
        expect(wrapper.findComponent('.v-list').text()).toContain(constantStrings.$tr(model));
      });
    });
    it('should render according to masteryModel prop', async () => {
      for (const model of MasteryModels) {
        await wrapper.setProps({ value: model });
        expect(wrapper.vm.$refs.masteryModel.value).toEqual(model);
      }
    });
  });
  describe('props', () => {
    beforeEach(() => {});
    it('setting readonly should prevent any edits', async () => {
      await wrapper.setProps({ readonly: true });
      expect(modelInput.attributes('readonly')).toEqual('readonly');
    });
    it('setting required to false should make fields not required (required by default)', async () => {
      expect(modelInput.attributes('required')).toEqual('required');

      await wrapper.setProps({ required: false });
      expect(modelInput.attributes('required')).toBeFalsy();
    });
    it('setting disabled should make fields disabled', async () => {
      expect(modelInput.attributes('disabled')).toBeFalsy();

      await wrapper.setProps({ disabled: true });
      expect(modelInput.attributes('disabled')).toEqual('disabled');
    });
  });
  describe('emitted events', () => {
    it('input should be emitted when masteryModel is updated', () => {
      expect(wrapper.emitted('input')).toBeFalsy();
      modelInput.setValue('do_all');
      expect(wrapper.emitted('input')).toBeTruthy();
      expect(wrapper.emitted('input')[0][0]).toEqual('do_all');
    });
  });
  describe('validation', () => {
    it('should flag empty required mastery models', async () => {
      await wrapper.setProps({ value: null });
      formWrapper.vm.validate();
      await wrapper.vm.$nextTick();
      expect(wrapper.findComponent({ ref: 'masteryModel' }).find('.error--text').exists()).toBe(
        true,
      );

      await wrapper.setProps({ required: false });
      formWrapper.vm.validate();
      await wrapper.vm.$nextTick();
      expect(wrapper.findComponent({ ref: 'masteryModel' }).find('.error--text').exists()).toBe(
        false,
      );
    });
  });
});
