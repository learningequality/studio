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
      expect(wrapper.vm.title).toEqual(DEFAULT_EXERCISE.title);
      expect(wrapper.vm.description).toEqual(DEFAULT_EXERCISE.description);
      expect(wrapper.vm.license.license).toEqual(DEFAULT_EXERCISE.license);
      expect(wrapper.vm.license.description).toEqual(DEFAULT_EXERCISE.license_description);
      expect(wrapper.vm.role).toEqual(DEFAULT_EXERCISE.role_visibility);
      expect(wrapper.vm.randomizeOrder).toEqual(DEFAULT_EXERCISE.extra_fields.randomize);
      expect(wrapper.vm.masteryModel.mastery_model).toEqual(
        DEFAULT_EXERCISE.extra_fields.mastery_model
      );
      expect(wrapper.vm.language).toEqual(DEFAULT_EXERCISE.language);
      expect(wrapper.vm.author).toEqual(DEFAULT_EXERCISE.author);
      expect(wrapper.vm.provider).toEqual(DEFAULT_EXERCISE.provider);
      expect(wrapper.vm.aggregator).toEqual(DEFAULT_EXERCISE.aggregator);
      expect(wrapper.vm.copyrightHolder).toEqual(DEFAULT_EXERCISE.copyright_holder);
    });
    it('varied fields should show placeholder', () => {
      DEFAULT_VIDEO.role_visibility = null;
      DEFAULT_VIDEO.language = null;
      DEFAULT_VIDEO.license = null;
      localStore.commit('edit_modal/SELECT_NODE', videoIndex);
      wrapper.vm.$nextTick(() => {
        expect(wrapper.vm.changes.license.varied).toBe(true);
        expect(wrapper.vm.changes.role_visibility.varied).toBe(true);
        expect(wrapper.vm.changes.language.varied).toBe(true);
        expect(wrapper.vm.changes.author.varied).toBe(true);
        expect(wrapper.vm.changes.provider.varied).toBe(true);
        expect(wrapper.vm.changes.aggregator.varied).toBe(true);
        expect(wrapper.vm.changes.copyright_holder.varied).toBe(true);
      });
    });
    describe('field visibility', () => {
      it('certain fields should be visible for exercise nodes', () => {
        expect(wrapper.find({ ref: 'title' }).exists()).toBe(true);
        expect(wrapper.find({ ref: 'description' }).exists()).toBe(true);
        expect(wrapper.find({ ref: 'tags' }).exists()).toBe(true);
        expect(wrapper.find({ ref: 'license' }).exists()).toBe(true);
        expect(wrapper.find({ ref: 'role_visibility' }).exists()).toBe(true);
        expect(wrapper.find({ ref: 'randomize' }).exists()).toBe(true);
        expect(wrapper.find({ ref: 'mastery_model' }).exists()).toBe(true);
        expect(wrapper.find({ ref: 'language' }).exists()).toBe(true);
        expect(wrapper.find({ ref: 'author' }).exists()).toBe(true);
        expect(wrapper.find({ ref: 'provider' }).exists()).toBe(true);
        expect(wrapper.find({ ref: 'aggregator' }).exists()).toBe(true);
        expect(wrapper.find({ ref: 'copyright_holder' }).exists()).toBe(true);
      });
      it('certain fields should be visible for video nodes', () => {
        localStore.commit('edit_modal/SET_NODE', videoIndex);
        localStore.commit('edit_modal/UPDATE_NODE', { license: specialPermissions.id });

        wrapper.vm.$nextTick(() => {
          expect(wrapper.find({ ref: 'title' }).exists()).toBe(true);
          expect(wrapper.find({ ref: 'description' }).exists()).toBe(true);
          expect(wrapper.find({ ref: 'tags' }).exists()).toBe(true);
          expect(wrapper.find({ ref: 'license' }).exists()).toBe(true);
          expect(wrapper.find({ ref: 'role_visibility' }).exists()).toBe(true);
          expect(wrapper.find({ ref: 'randomize' }).exists()).toBe(false);
          expect(wrapper.find({ ref: 'mastery_model' }).exists()).toBe(false);
          expect(wrapper.find({ ref: 'language' }).exists()).toBe(true);
          expect(wrapper.find({ ref: 'author' }).exists()).toBe(true);
          expect(wrapper.find({ ref: 'provider' }).exists()).toBe(true);
          expect(wrapper.find({ ref: 'aggregator' }).exists()).toBe(true);
          expect(wrapper.find({ ref: 'copyright_holder' }).exists()).toBe(true);
        });
      });
      it('certain fields should be visible for topics', () => {
        localStore.commit('edit_modal/SET_NODE', topicIndex);

        wrapper.vm.$nextTick(() => {
          expect(wrapper.find({ ref: 'title' }).exists()).toBe(true);
          expect(wrapper.find({ ref: 'description' }).exists()).toBe(true);
          expect(wrapper.find({ ref: 'tags' }).exists()).toBe(true);
          expect(wrapper.find({ ref: 'license' }).exists()).toBe(false);
          expect(wrapper.find({ ref: 'role_visibility' }).exists()).toBe(false);
          expect(wrapper.find({ ref: 'randomize' }).exists()).toBe(false);
          expect(wrapper.find({ ref: 'mastery_model' }).exists()).toBe(false);
          expect(wrapper.find({ ref: 'language' }).exists()).toBe(true);
          expect(wrapper.find({ ref: 'author' }).exists()).toBe(false);
          expect(wrapper.find({ ref: 'provider' }).exists()).toBe(false);
          expect(wrapper.find({ ref: 'aggregator' }).exists()).toBe(false);
          expect(wrapper.find({ ref: 'copyright_holder' }).exists()).toBe(false);
        });
      });
      it('certain fields should be hidden when multiple items are selected', () => {
        localStore.commit('edit_modal/SELECT_NODE', exercise2Index);
        wrapper.vm.$nextTick(() => {
          expect(wrapper.find({ ref: 'title' }).exists()).toBe(false);
          expect(wrapper.find({ ref: 'description' }).exists()).toBe(false);
          expect(wrapper.find({ ref: 'tags' }).exists()).toBe(true);
          expect(wrapper.find({ ref: 'license' }).exists()).toBe(true);
          expect(wrapper.find({ ref: 'role_visibility' }).exists()).toBe(true);
          expect(wrapper.find({ ref: 'randomize' }).exists()).toBe(true);
          expect(wrapper.find({ ref: 'mastery_model' }).exists()).toBe(true);
          expect(wrapper.find({ ref: 'language' }).exists()).toBe(true);
          expect(wrapper.find({ ref: 'author' }).exists()).toBe(true);
          expect(wrapper.find({ ref: 'provider' }).exists()).toBe(true);
          expect(wrapper.find({ ref: 'aggregator' }).exists()).toBe(true);
          expect(wrapper.find({ ref: 'copyright_holder' }).exists()).toBe(true);
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
        expect(wrapper.vm.rules.title[0](null)).not.toBe(true);
        expect(wrapper.vm.rules.title[0]('title')).toBe(true);
      });
      it('copyright_holder should be marked as required if license requires copyright holder', () => {
        expect(wrapper.vm.rules.copyrightHolder[0](null)).not.toBe(true);
        expect(wrapper.vm.rules.copyrightHolder[0]('copyright holder')).toBe(true);
      });
      it('copyright_holder should not be marked as required if freeze_authoring_data is true', () => {
        DEFAULT_VIDEO.freeze_authoring_data = true;
        DEFAULT_VIDEO.license = specialPermissions.id;
        DEFAULT_VIDEO.copyright_holder = null;
        localStore.commit('edit_modal/SET_NODE', videoIndex);
        expect(wrapper.vm.rules.copyrightHolder[0](null)).toBe(true);
      });
    });
  });
});
