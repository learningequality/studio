import find from 'lodash/find';
import findIndex from 'lodash/findIndex';
import pick from 'lodash/pick';
import Vue from 'vue';
import Vuetify from 'vuetify';
import { mount } from '@vue/test-utils';
import DetailsTabView from '../DetailsTabView.vue';
import {
  localStore,
  DEFAULT_TOPIC,
  DEFAULT_VIDEO,
  DEFAULT_EXERCISE,
  DEFAULT_EXERCISE2,
} from './data.js';
import { LicensesList } from 'shared/leUtils/Licenses';
import { NEW_OBJECT } from 'shared/constants';

Vue.use(Vuetify);

document.body.setAttribute('data-app', true); // Vuetify prints a warning without this

const testNodes = [DEFAULT_TOPIC, DEFAULT_VIDEO, DEFAULT_EXERCISE, DEFAULT_EXERCISE2];
localStore.commit('edit_modal/RESET_STATE');
localStore.commit('edit_modal/SET_NODES', testNodes);
localStore.commit('edit_modal/SET_LOADED_NODES', testNodes);

const specialPermissions = find(LicensesList, { is_custom: true });

function makeWrapper(props = {}) {
  return mount(DetailsTabView, {
    // Would like to get rid of this eventually, but there's a bug
    // that throws `TypeError: Cannot read property '$scopedSlots' of undefined`
    // See: https://github.com/vuejs/vue-test-utils/issues/1130
    sync: false,
    store: localStore,
    attachTo: document.body,
    propsData: {
      viewOnly: false,
      ...props,
    },
    stubs: {
      FileUpload: true,
      FileStorage: true,
    },
  });
}

window.Urls = {
  channel: id => {
    return id;
  },
};

describe.skip('detailsTabView', () => {
  let wrapper;
  const topicIndex = findIndex(testNodes, { id: DEFAULT_TOPIC.id });
  const videoIndex = findIndex(testNodes, { id: DEFAULT_VIDEO.id });
  const exerciseIndex = findIndex(testNodes, { id: DEFAULT_EXERCISE.id });
  const exercise2Index = findIndex(testNodes, { id: DEFAULT_EXERCISE2.id });
  beforeEach(() => {
    localStore.commit('edit_modal/SET_NODE', exerciseIndex);
    wrapper = makeWrapper();
  });
  describe('on render', () => {
    // TODO: add defaults for 'accessibility' field
    // TODO: add defaults for 'grade_levels' field
    // TODO: add defaults for 'learner_needs' field
    it('all fields should match node field values', () => {
      const keys = [
        'language',
        'title',
        'description',
        'author',
        'provider',
        'aggregator',
        'role',
        'license',
        'masteryModel',
        'randomizeOrder',
        'copyrightHolder',
      ];
      expect(pick(wrapper.vm, keys)).toEqual({
        ...pick(DEFAULT_EXERCISE, keys),
        license: {
          license: DEFAULT_EXERCISE.license,
          description: DEFAULT_EXERCISE.license_description,
        },
        role: DEFAULT_EXERCISE.role_visibility,
        randomizeOrder: DEFAULT_EXERCISE.extra_fields.randomize,
        masteryModel: {
          mastery_model: DEFAULT_EXERCISE.extra_fields.mastery_model,
        },
        copyrightHolder: DEFAULT_EXERCISE.copyright_holder,
      });
    });
    it('varied fields should have varied set to true', () => {
      DEFAULT_VIDEO.role_visibility = null;
      DEFAULT_VIDEO.language = null;
      DEFAULT_VIDEO.license = null;
      localStore.commit('edit_modal/SELECT_NODE', videoIndex);
      wrapper.vm.$nextTick(() => {
        const keys = [
          'license',
          'role_visibility',
          'language',
          'author',
          'provider',
          'aggregator',
          'copyright_holder',
        ];
        keys.forEach(key => {
          expect(wrapper.vm.changes[key].varied).toBe(true);
        });
      });
    });
    describe('field visibility', () => {
      it('certain fields should be visible for exercise nodes', () => {
        expect(wrapper.vm.allExercises).toBe(true);
      });
      it('certain fields should be visible for video nodes', () => {
        localStore.commit('edit_modal/SET_NODE', videoIndex);
        localStore.commit('edit_modal/UPDATE_NODE', { license: specialPermissions.id });
        expect(wrapper.vm.allResources).toBe(true);
      });
      it('certain fields should be visible for topics', () => {
        localStore.commit('edit_modal/SET_NODE', topicIndex);
        expect(wrapper.vm.allResources).toBe(false);
      });
      it('certain fields should be hidden when multiple items are selected', () => {
        localStore.commit('edit_modal/SELECT_NODE', exercise2Index);
        expect(wrapper.vm.oneSelected).toBe(false);
      });
    });
    it('if content is imported from view-only channel, source fields should be readonly', () => {
      DEFAULT_VIDEO.original_source_node_id = 'other-node-id';
      DEFAULT_VIDEO.original_channel = {
        id: 'other-channel-id',
        name: 'Other Channel',
      };
      DEFAULT_VIDEO.freeze_authoring_data = true;
      localStore.commit('edit_modal/SET_NODE', videoIndex);
      expect(wrapper.vm.importUrl).toContain('other-node-id');
      expect(wrapper.vm.importChannelName).toContain('Other Channel');
      expect(wrapper.vm.disableAuthEdits).toBe(true);
    });
  });
  describe('on input', () => {
    it('text fields should set selected node data according to their inputted values', () => {
      wrapper.find({ ref: 'title' }).vm.$emit('input', 'New Title');
      expect(wrapper.vm.title).toEqual('New Title');
    });
    it('exercise fields should set selected node data extra_fields', () => {
      wrapper.find({ ref: 'mastery_model' }).vm.$emit('input', { type: 'm_of_n' });
      expect(wrapper.vm.masteryModel.mastery_model).toEqual('m_of_n');
    });
  });
  describe('on validation', () => {
    describe('automatic validation', () => {
      const validationMethod = jest.fn();
      beforeEach(() => {
        wrapper.setMethods({
          handleValidation: validationMethod,
        });
      });

      it('should not automatically validate new items', () => {
        DEFAULT_EXERCISE[NEW_OBJECT] = true;
        DEFAULT_EXERCISE.title = null;
        expect(validationMethod).not.toHaveBeenCalled();
        DEFAULT_EXERCISE.title = 'title';
      });
      it('should automatically validate existing items', () => {
        delete DEFAULT_EXERCISE[NEW_OBJECT];
        DEFAULT_EXERCISE.title = null;
        expect(validationMethod).toHaveBeenCalled();
        DEFAULT_EXERCISE.title = 'title';
      });
    });
    describe('field validation', () => {
      it('title should be marked as required if field is blank', () => {
        expect(wrapper.vm.titleRules[0](null)).not.toBe(true);
        expect(wrapper.vm.titleRules[0]('title')).toBe(true);
      });
      it('copyright_holder should be marked as required if license requires copyright holder', () => {
        expect(wrapper.vm.copyrightHolderRules[0](null)).not.toBe(true);
        expect(wrapper.vm.copyrightHolderRules[0]('copyright holder')).toBe(true);
      });
      it('copyright_holder should not be marked as required if freeze_authoring_data is true', () => {
        DEFAULT_VIDEO.freeze_authoring_data = true;
        DEFAULT_VIDEO.license = specialPermissions.id;
        DEFAULT_VIDEO.copyright_holder = null;
        localStore.commit('edit_modal/SET_NODE', videoIndex);
        expect(wrapper.vm.copyrightHolderRules[0](null)).toBe(true);
      });
    });
  });
});
