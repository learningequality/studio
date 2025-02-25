import { mount } from '@vue/test-utils';
import MasteryCriteriaGoal from '../CompletionOptions/MasteryCriteriaGoal';
import TestForm from 'shared/views/__tests__/TestForm';
import { constantStrings } from 'shared/mixins';
import MasteryModels from 'shared/leUtils/MasteryModels';

document.body.setAttribute('data-app', true); // Vuetify prints a warning without this

describe('MasteryCriteriaGoal', () => {});
function makeWrapper() {
  return mount(TestForm, {
    slots: {
      testComponent: MasteryCriteriaGoal,
    },
  });
}

describe('masteryCriteriaGoal', () => {
  let formWrapper;
  let wrapper;
  let modelInput;

  beforeEach(() => {
    formWrapper = makeWrapper();
    wrapper = formWrapper.find(MasteryCriteriaGoal);
    wrapper.setProps({ value: 'm_of_n' });
    modelInput = wrapper.find({ ref: 'masteryModel' }).find('input');
  });

  describe('on load', () => {
    MasteryModels.forEach(model => {
      it(`${model} mastery option should be an option to select`, () => {
        expect(wrapper.find('.v-list').text()).toContain(constantStrings.$tr(model));
      });
    });
    it('should render according to masteryModel prop', () => {
      function test(model) {
        wrapper.setProps({ value: model });
        expect(wrapper.vm.$refs.masteryModel.value).toEqual(model);
      }
      MasteryModels.forEach(test);
    });
  });
  describe('props', () => {
    beforeEach(() => {});
    it('setting readonly should prevent any edits', () => {
      wrapper.setProps({ readonly: true });
      wrapper.vm.$nextTick(() => {
        expect(modelInput.attributes('readonly')).toEqual('readonly');
      });
    });
    it('setting required to false should make fields not required (required by default)', () => {
      expect(modelInput.attributes('required')).toEqual('required');

      wrapper.setProps({ required: false });
      wrapper.vm.$nextTick(() => {
        expect(modelInput.attributes('required')).toBeFalsy();
      });
    });
    it('setting disabled should make fields disabled', () => {
      expect(modelInput.attributes('disabled')).toBeFalsy();

      wrapper.setProps({ disabled: true });
      wrapper.vm.$nextTick(() => {
        expect(modelInput.attributes('disabled')).toEqual('disabled');
      });
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
    it('should flag empty required mastery models', () => {
      wrapper.setProps({ value: null });
      formWrapper.vm.validate();
      expect(wrapper.find({ ref: 'masteryModel' }).find('.error--text').exists()).toBe(true);
      wrapper.setProps({ required: false });
      formWrapper.vm.validate();
      expect(wrapper.find({ ref: 'masteryModel' }).find('.error--text').exists()).toBe(false);
    });
  });
});
