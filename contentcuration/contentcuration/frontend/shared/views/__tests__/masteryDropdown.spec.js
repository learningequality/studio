import { mount } from '@vue/test-utils';
import MasteryDropdown from '../MasteryDropdown.vue';
import InfoModal from '../InfoModal.vue';
import TestForm from './TestForm.vue';
import { constantStrings } from 'shared/mixins';
import MasteryModels from 'shared/leUtils/MasteryModels';

document.body.setAttribute('data-app', true); // Vuetify prints a warning without this

function makeWrapper() {
  return mount(TestForm, {
    slots: {
      testComponent: MasteryDropdown,
    },
  });
}

describe('masteryDropdown', () => {
  let formWrapper;
  let wrapper;
  let modelInput;
  let mInput;
  let nInput;

  beforeEach(() => {
    formWrapper = makeWrapper();
    wrapper = formWrapper.find(MasteryDropdown);
    wrapper.setProps({ value: { mastery_model: 'm_of_n' } });
    modelInput = wrapper.find({ ref: 'masteryModel' }).find('input');
    wrapper.vm.$nextTick(() => {
      mInput = wrapper.find({ ref: 'mValue' }).find('input');
      nInput = wrapper.find({ ref: 'nValue' }).find('input');
    });
  });

  describe('on load', () => {
    MasteryModels.forEach(model => {
      it(`${model} mastery option should be an option to select`, () => {
        expect(wrapper.find('.v-list').text()).toContain(constantStrings.$tr(model));
      });
    });
    it('should render according to masteryModel prop', () => {
      function test(model) {
        wrapper.setProps({ value: { mastery_model: model } });
        expect(wrapper.vm.$refs.masteryModel.value).toEqual(model);
        expect(wrapper.find({ ref: 'mValue' }).exists()).toBe(model === 'm_of_n');
        expect(wrapper.find({ ref: 'nValue' }).exists()).toBe(model === 'm_of_n');
      }
      MasteryModels.forEach(test);
    });
    it('should render correct mValue and nValue props', () => {
      wrapper.setProps({ value: { mastery_model: 'm_of_n', m: 10, n: 20 } });
      expect(wrapper.vm.$refs.mValue.value).toEqual(10);
      expect(wrapper.vm.$refs.nValue.value).toEqual(20);
    });
  });
  describe('props', () => {
    beforeEach(() => {});
    it('setting readonly should prevent any edits', () => {
      wrapper.setProps({ readonly: true });
      wrapper.vm.$nextTick(() => {
        expect(modelInput.attributes('readonly')).toEqual('readonly');
        expect(mInput.attributes('readonly')).toEqual('readonly');
        expect(nInput.attributes('readonly')).toEqual('readonly');
      });
    });
    it('setting required to false should make fields not required (required by default)', () => {
      expect(modelInput.attributes('required')).toEqual('required');
      expect(mInput.attributes('required')).toEqual('required');
      expect(nInput.attributes('required')).toEqual('required');

      wrapper.setProps({ required: false, mRequired: false, nRequired: false });
      wrapper.vm.$nextTick(() => {
        expect(modelInput.attributes('required')).toBeFalsy();
        expect(mInput.attributes('required')).toBeFalsy();
        expect(nInput.attributes('required')).toBeFalsy();
      });
    });
    it('setting disabled should make fields disabled', () => {
      expect(modelInput.attributes('disabled')).toBeFalsy();
      expect(mInput.attributes('disabled')).toBeFalsy();
      expect(nInput.attributes('disabled')).toBeFalsy();

      wrapper.setProps({ disabled: true });
      wrapper.vm.$nextTick(() => {
        expect(modelInput.attributes('disabled')).toEqual('disabled');
        expect(mInput.attributes('disabled')).toEqual('disabled');
        expect(nInput.attributes('disabled')).toEqual('disabled');
      });
    });
  });
  describe('mastery model info modal', () => {
    it('should open the info modal when button is clicked', () => {
      expect(wrapper.find('.v-dialog').isVisible()).toBe(false);
      let button = wrapper.find(InfoModal).find('.v-icon');
      button.trigger('click');
      expect(wrapper.find('.v-dialog').isVisible()).toBe(true);
    });
  });
  describe('emitted events', () => {
    it('input should be emitted when masteryModel is updated', () => {
      expect(wrapper.emitted('input')).toBeFalsy();
      modelInput.setValue('do_all');
      expect(wrapper.emitted('input')).toBeTruthy();
      expect(wrapper.emitted('input')[0][0].mastery_model).toEqual('do_all');
    });
    it('input should be emitted when mValue is updated', () => {
      expect(wrapper.emitted('input')).toBeFalsy();
      mInput.setValue(10);
      expect(wrapper.emitted('input')).toBeTruthy();
      expect(wrapper.emitted('input')[0][0].m).toEqual(10);
    });
    it('input should be emitted when mValue is updated', () => {
      expect(wrapper.emitted('input')).toBeFalsy();
      nInput.setValue(10);
      expect(wrapper.emitted('input')).toBeTruthy();
      expect(wrapper.emitted('input')[0][0].n).toEqual(10);
    });
  });
  describe('validation', () => {
    it('should flag empty required mastery models', () => {
      wrapper.setProps({ value: { mastery_model: null } });
      formWrapper.vm.validate();
      expect(
        wrapper
          .find({ ref: 'masteryModel' })
          .find('.error--text')
          .exists()
      ).toBe(true);
      wrapper.setProps({ required: false });
      formWrapper.vm.validate();
      expect(
        wrapper
          .find({ ref: 'masteryModel' })
          .find('.error--text')
          .exists()
      ).toBe(false);
    });
    it('should flag empty n and m values', () => {
      formWrapper.vm.validate();
      expect(
        wrapper
          .find({ ref: 'mValue' })
          .find('.error--text')
          .exists()
      ).toBe(true);
      expect(
        wrapper
          .find({ ref: 'nValue' })
          .find('.error--text')
          .exists()
      ).toBe(true);
      wrapper.setProps({ mRequired: false, nRequired: false });
      formWrapper.vm.validate();
      expect(
        wrapper
          .find({ ref: 'mValue' })
          .find('.error--text')
          .exists()
      ).toBe(false);
      expect(
        wrapper
          .find({ ref: 'nValue' })
          .find('.error--text')
          .exists()
      ).toBe(false);
    });
    it('should flag if m is not a whole number', () => {
      wrapper.setProps({ value: { mastery_model: 'm_of_n', m: 0.1231, n: 10 } });
      formWrapper.vm.validate();
      expect(
        wrapper
          .find({ ref: 'mValue' })
          .find('.error--text')
          .exists()
      ).toBe(true);
      wrapper.setProps({ value: { mastery_model: 'm_of_n', m: 1, n: 10 } });
      formWrapper.vm.validate();
      expect(
        wrapper
          .find({ ref: 'mValue' })
          .find('.error--text')
          .exists()
      ).toBe(false);
    });
    it('should flag if m < 1', () => {
      wrapper.setProps({ value: { mastery_model: 'm_of_n', m: 0, n: 10 } });
      formWrapper.vm.validate();
      expect(
        wrapper
          .find({ ref: 'mValue' })
          .find('.error--text')
          .exists()
      ).toBe(true);
      wrapper.setProps({ value: { mastery_model: 'm_of_n', m: 1, n: 10 } });
      formWrapper.vm.validate();
      expect(
        wrapper
          .find({ ref: 'mValue' })
          .find('.error--text')
          .exists()
      ).toBe(false);
    });
    it('should flag if m > n', () => {
      wrapper.setProps({ value: { mastery_model: 'm_of_n', m: 2, n: 1 } });
      formWrapper.vm.validate();
      expect(
        wrapper
          .find({ ref: 'mValue' })
          .find('.error--text')
          .exists()
      ).toBe(true);
      wrapper.setProps({ value: { mastery_model: 'm_of_n', m: 2, n: 2 } });
      formWrapper.vm.validate();
      expect(
        wrapper
          .find({ ref: 'mValue' })
          .find('.error--text')
          .exists()
      ).toBe(false);
    });
  });
});
