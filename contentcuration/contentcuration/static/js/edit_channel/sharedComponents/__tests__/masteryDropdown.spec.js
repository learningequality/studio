import _ from 'underscore';
import Vue from 'vue';
import Vuetify from 'vuetify';
import { mount } from '@vue/test-utils';
import MasteryDropdown from '../MasteryDropdown.vue';
import InfoModal from '../InfoModal.vue';
import Constants from 'edit_channel/constants';
import { translate } from 'edit_channel/utils/string_helper';

Vue.use(Vuetify);

document.body.setAttribute('data-app', true); // Vuetify prints a warning without this

function makeWrapper(props = {}) {
  return mount(MasteryDropdown, {
    attachToDocument: true,
    propsData: props,
  });
}

describe('masteryDropdown', () => {
  let wrapper;
  let modelInput;
  let mInput;
  let nInput;

  beforeEach(() => {
    wrapper = makeWrapper({ masteryModel: 'm_of_n' });
    modelInput = wrapper.find({ ref: 'masteryModel' }).find('input');
    mInput = wrapper.find({ ref: 'mValue' }).find('input');
    nInput = wrapper.find({ ref: 'nValue' }).find('input');
  });

  describe('on load', () => {
    it('all mastery options should be an option to select', () => {
      _.each(Constants.MasteryModels, model => {
        expect(wrapper.find('.v-list').text()).toContain(translate(model));
      });
    });
    it('should render according to masteryModel prop', () => {
      function test(model) {
        wrapper = makeWrapper({ masteryModel: model });
        expect(wrapper.vm.$refs.masteryModel.value).toEqual(model);
        expect(wrapper.find({ ref: 'mValue' }).exists()).toBe(model === 'm_of_n');
        expect(wrapper.find({ ref: 'nValue' }).exists()).toBe(model === 'm_of_n');
      }
      _.each(Constants.MasteryModels, test);
    });
    it('should render correct mValue and nValue props', () => {
      wrapper = makeWrapper({ masteryModel: 'm_of_n', mValue: 10, nValue: 20 });
      expect(wrapper.vm.$refs.mValue.value).toEqual(10);
      expect(wrapper.vm.$refs.nValue.value).toEqual(20);
    });
  });
  describe('props', () => {
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
      let wrapper = makeWrapper();
      expect(wrapper.find('.v-dialog').isVisible()).toBe(false);
      let button = wrapper.find(InfoModal).find('.v-btn');
      button.trigger('click');
      expect(wrapper.find('.v-dialog').isVisible()).toBe(true);
    });
  });
  describe('emitted events', () => {
    it('changed should be emitted when masteryModel is updated', () => {
      expect(wrapper.emitted('changed')).toBeFalsy();
      modelInput.setValue('do_all');
      expect(wrapper.emitted('changed')).toBeTruthy();
      expect(wrapper.emitted('changed')[0][0].mastery_model).toEqual('do_all');
    });
    it('changed should be emitted when mValue is updated', () => {
      expect(wrapper.emitted('changed')).toBeFalsy();
      mInput.setValue(10);
      expect(wrapper.emitted('changed')).toBeTruthy();
      expect(wrapper.emitted('changed')[0][0].m).toEqual(10);
    });
    it('changed should be emitted when mValue is updated', () => {
      expect(wrapper.emitted('changed')).toBeFalsy();
      nInput.setValue(10);
      expect(wrapper.emitted('changed')).toBeTruthy();
      expect(wrapper.emitted('changed')[0][0].n).toEqual(10);
    });
  });
});
