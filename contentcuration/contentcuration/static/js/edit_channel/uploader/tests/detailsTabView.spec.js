import _ from 'underscore';
import Vue from 'vue';
import Vuetify from 'vuetify';
import { mount } from '@vue/test-utils';
import DetailsTabView from './../views/DetailsTabView.vue';
import {
  localStore,
  DEFAULT_TOPIC,
  DEFAULT_VIDEO,
  DEFAULT_EXERCISE,
  DEFAULT_EXERCISE2,
} from './data.js';
import Constants from 'edit_channel/constants';
import State from 'edit_channel/state';

Vue.use(Vuetify);

document.body.setAttribute('data-app', true); // Vuetify prints a warning without this
State.current_channel = {
  id: 'test-channel',
};

const testNodes = [DEFAULT_TOPIC, DEFAULT_VIDEO, DEFAULT_EXERCISE, DEFAULT_EXERCISE2];
localStore.commit('edit_modal/RESET_STATE');
localStore.commit('edit_modal/SET_NODES', testNodes);
localStore.commit('edit_modal/SET_LOADED_NODES', testNodes);

let specialPermissions = _.findWhere(Constants.Licenses, { is_custom: true });

function makeWrapper(props = {}) {
  return mount(DetailsTabView, {
    // Would like to get rid of this eventually, but there's a bug
    // that throws `TypeError: Cannot read property '$scopedSlots' of undefined`
    // See: https://github.com/vuejs/vue-test-utils/issues/1130
    sync: false,
    store: localStore,
    attachToDocument: true,
    propsData: {
      viewOnly: false,
      ...props,
    },
  });
}

window.Urls = {
  channel_view_only: id => {
    return id;
  },
};

describe('detailsTabView', () => {
  let wrapper;
  let topicIndex = _.findIndex(testNodes, { id: DEFAULT_TOPIC.id });
  let videoIndex = _.findIndex(testNodes, { id: DEFAULT_VIDEO.id });
  let exerciseIndex = _.findIndex(testNodes, { id: DEFAULT_EXERCISE.id });
  let exercise2Index = _.findIndex(testNodes, { id: DEFAULT_EXERCISE2.id });
  beforeEach(() => {
    localStore.commit('edit_modal/SET_NODE', exerciseIndex);
    wrapper = makeWrapper();
  });
  describe('on render', () => {
    it('all fields should match node field values', () => {
      let keys = [
        'tags',
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
      expect(_.pick(wrapper.vm, keys)).toEqual({
        ..._.pick(DEFAULT_EXERCISE, keys),
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
        let keys = [
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
      let keys = [
        'title',
        'description',
        'tags',
        'license',
        'role_visibility',
        'randomize',
        'mastery_model',
        'language',
        'author',
        'provider',
        'aggregator',
        'copyright_holder',
      ];
      it('certain fields should be visible for exercise nodes', () => {
        keys.forEach(key => {
          expect(wrapper.find({ ref: key }).exists()).toBe(true);
        });
      });
      it('certain fields should be visible for video nodes', () => {
        localStore.commit('edit_modal/SET_NODE', videoIndex);
        localStore.commit('edit_modal/UPDATE_NODE', { license: specialPermissions.id });

        wrapper.vm.$nextTick(() => {
          let hiddenKeys = ['mastery_model', 'randomize'];
          keys.forEach(key => {
            expect(wrapper.find({ ref: key }).exists()).toBe(!hiddenKeys.includes(key));
          });
        });
      });
      it('certain fields should be visible for topics', () => {
        localStore.commit('edit_modal/SET_NODE', topicIndex);

        wrapper.vm.$nextTick(() => {
          let visibleKeys = ['title', 'description', 'tags', 'language'];
          keys.forEach(key => {
            expect(wrapper.find({ ref: key }).exists()).toBe(visibleKeys.includes(key));
          });
        });
      });
      it('certain fields should be hidden when multiple items are selected', () => {
        localStore.commit('edit_modal/SELECT_NODE', exercise2Index);
        wrapper.vm.$nextTick(() => {
          let hiddenKeys = ['title', 'description'];
          keys.forEach(key => {
            expect(wrapper.find({ ref: key }).exists()).toBe(!hiddenKeys.includes(key));
          });
        });
      });
    });

    it('all fields should be readonly in view only mode', () => {
      wrapper.setProps({ viewOnly: true });
      wrapper.vm.$nextTick(() => {
        expect(wrapper.find({ ref: 'title' }).vm.readonly).toBe(true);
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
      wrapper.find({ ref: 'mastery_model' }).vm.$emit('input', { mastery_model: 'm_of_n' });
      expect(wrapper.vm.masteryModel.mastery_model).toEqual('m_of_n');
    });
    it('tags should set selected node data tags list', () => {
      let tagInput = wrapper.find({ ref: 'tags' });
      tagInput.vm.$emit('input', ['Tag X']);
      expect(wrapper.vm.contentTags).toContain('Tag X');

      tagInput.vm.$emit('input', ['Tag Y']);
      expect(wrapper.vm.contentTags).not.toContain('Tag X');
      expect(wrapper.vm.contentTags).toContain('Tag Y');
    });
  });
  describe('on validation', () => {
    describe('automatic validation', () => {
      let validationMethod = jest.fn();
      beforeEach(() => {
        wrapper.setMethods({
          handleValidation: validationMethod,
        });
      });

      it('should not automatically validate new items', () => {
        DEFAULT_EXERCISE.isNew = true;
        DEFAULT_EXERCISE.title = null;
        expect(validationMethod).not.toHaveBeenCalled();
        DEFAULT_EXERCISE.title = 'title';
      });
      it('should automatically validate existing items', () => {
        DEFAULT_EXERCISE.isNew = false;
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
