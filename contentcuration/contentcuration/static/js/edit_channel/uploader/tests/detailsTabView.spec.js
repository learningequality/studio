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
    wrapper = makeWrapper();
    localStore.commit('edit_modal/RESET_STATE');
    localStore.commit('edit_modal/SET_NODES', testNodes);
    localStore.commit('edit_modal/SET_LOADED_NODES', testNodes);
    wrapper = makeWrapper();
    localStore.commit('edit_modal/SET_NODE', exerciseIndex);
  });
  describe('on render', () => {
    it('all fields should show node field values', () => {
      wrapper.vm.$nextTick(() => {
        expect(wrapper.find({ ref: 'title' }).find('input').element.value).toEqual(
          DEFAULT_EXERCISE.title
        );
        expect(wrapper.find({ ref: 'description' }).find('textarea').element.value).toEqual(
          DEFAULT_EXERCISE.description
        );
        expect(wrapper.find({ ref: 'license' }).html()).toContain(specialPermissions.license_name);
        expect(wrapper.find({ ref: 'license' }).find('textarea').element.value).toEqual(
          DEFAULT_EXERCISE.license_description
        );
        expect(wrapper.find({ ref: 'role_visibility' }).html()).toContain('Coaches');
        expect(
          wrapper
            .find({ ref: 'randomize' })
            .find('input')
            .attributes('aria-checked')
        ).toEqual(DEFAULT_EXERCISE.extra_fields.randomize.toString());

        // v-autocomplete works a little differently, so check the nested v-input component
        expect(wrapper.find({ ref: 'mastery_model' }).find('.v-input').vm.value).toEqual(
          DEFAULT_EXERCISE.extra_fields.mastery_model
        );
        expect(wrapper.find({ ref: 'language' }).find('.v-input').vm.value).toEqual(
          DEFAULT_EXERCISE.language
        );
        expect(wrapper.find({ ref: 'author' }).find('.v-input').vm.value).toEqual(
          DEFAULT_EXERCISE.author
        );
        expect(wrapper.find({ ref: 'provider' }).find('.v-input').vm.value).toEqual(
          DEFAULT_EXERCISE.provider
        );
        expect(wrapper.find({ ref: 'aggregator' }).find('.v-input').vm.value).toEqual(
          DEFAULT_EXERCISE.aggregator
        );
        expect(wrapper.find({ ref: 'copyright_holder' }).find('.v-input').vm.value).toEqual(
          DEFAULT_EXERCISE.copyright_holder
        );
      });
    });
    it('varied fields should show placeholder', () => {
      DEFAULT_VIDEO.role_visibility = null;
      DEFAULT_VIDEO.language = null;
      localStore.commit('edit_modal/SELECT_NODE', videoIndex);
      wrapper.vm.$nextTick(() => {
        let placeholderText = '---';
        expect(wrapper.find({ ref: 'license' }).html()).toContain(placeholderText);
        expect(wrapper.find({ ref: 'role_visibility' }).find('.v-input').vm.placeholder).toEqual(
          placeholderText
        );
        expect(wrapper.find({ ref: 'language' }).find('.v-input').vm.placeholder).toEqual(
          placeholderText
        );
        expect(wrapper.find({ ref: 'author' }).find('.v-input').vm.placeholder).toEqual(
          placeholderText
        );
        expect(wrapper.find({ ref: 'provider' }).find('.v-input').vm.placeholder).toEqual(
          placeholderText
        );
        expect(wrapper.find({ ref: 'aggregator' }).find('.v-input').vm.placeholder).toEqual(
          placeholderText
        );
        expect(wrapper.find({ ref: 'copyright_holder' }).find('.v-input').vm.placeholder).toEqual(
          placeholderText
        );
      });
    });
    describe('field visibility', () => {
      it('certain fields should be visible for exercise nodes', () => {
        wrapper.vm.$nextTick(() => {
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
        expect(
          wrapper
            .find({ ref: 'title' })
            .find('input')
            .attributes('readonly')
        ).toEqual('readonly');
        expect(
          wrapper
            .find({ ref: 'description' })
            .find('textarea')
            .attributes('readonly')
        ).toEqual('readonly');
        expect(
          wrapper
            .find({ ref: 'tags' })
            .find('input')
            .attributes('readonly')
        ).toEqual('readonly');
        expect(
          wrapper
            .find({ ref: 'license' })
            .find('input')
            .attributes('readonly')
        ).toEqual('readonly');
        expect(
          wrapper
            .find({ ref: 'role_visibility' })
            .find('input')
            .attributes('readonly')
        ).toEqual('readonly');
        expect(
          wrapper
            .find({ ref: 'randomize' })
            .find('input')
            .attributes('disabled')
        ).toEqual('disabled');
        expect(
          wrapper
            .find({ ref: 'mastery_model' })
            .find('input')
            .attributes('readonly')
        ).toEqual('readonly');
        expect(
          wrapper
            .find({ ref: 'language' })
            .find('input')
            .attributes('readonly')
        ).toEqual('readonly');
        expect(
          wrapper
            .find({ ref: 'author' })
            .find('input')
            .attributes('readonly')
        ).toEqual('readonly');
        expect(
          wrapper
            .find({ ref: 'provider' })
            .find('input')
            .attributes('readonly')
        ).toEqual('readonly');
        expect(
          wrapper
            .find({ ref: 'aggregator' })
            .find('input')
            .attributes('readonly')
        ).toEqual('readonly');
        expect(
          wrapper
            .find({ ref: 'copyright_holder' })
            .find('input')
            .attributes('readonly')
        ).toEqual('readonly');
      });
    });

    it('tags should show tags associated with selected nodes', () => {
      localStore.commit('edit_modal/SET_TAGS', ['A Tag']);
      localStore.commit('edit_modal/SELECT_NODE', videoIndex);
      localStore.commit('edit_modal/SET_TAGS', ['B Tag']);

      wrapper.vm.$nextTick(() => {
        expect(wrapper.find({ ref: 'tags' }).html()).not.toContain('A Tag');
        expect(wrapper.find({ ref: 'tags' }).html()).toContain('B Tag');
      });
    });
    it('if content is imported from view-only channel, source fields should be readonly', () => {
      DEFAULT_VIDEO.license = specialPermissions.id;
      DEFAULT_VIDEO.original_source_node_id = 'other-node-id';
      DEFAULT_VIDEO.original_channel = {
        id: 'other-channel-id',
        name: 'Other Channel',
      };
      DEFAULT_VIDEO.freeze_authoring_data = true;
      localStore.commit('edit_modal/SET_NODE', videoIndex);

      wrapper.vm.$nextTick(() => {
        expect(wrapper.find('.import-link').attributes('href')).toContain('other-node-id');
        expect(wrapper.find('.import-link').text()).toContain('Other Channel');
        expect(
          wrapper
            .find({ ref: 'license' })
            .find('input')
            .attributes('readonly')
        ).toEqual('readonly');
        expect(
          wrapper
            .find({ ref: 'author' })
            .find('input')
            .attributes('readonly')
        ).toEqual('readonly');
        expect(
          wrapper
            .find({ ref: 'provider' })
            .find('input')
            .attributes('readonly')
        ).toEqual('readonly');
        expect(
          wrapper
            .find({ ref: 'aggregator' })
            .find('input')
            .attributes('readonly')
        ).toEqual('readonly');
        expect(
          wrapper
            .find({ ref: 'copyright_holder' })
            .find('input')
            .attributes('readonly')
        ).toEqual('readonly');
      });
    });
  });
  describe('on input', () => {
    it('text fields should set selected node data according to their inputted values', () => {
      // Title
      wrapper
        .find({ ref: 'title' })
        .find('input')
        .setValue('New Title');
      wrapper
        .find({ ref: 'title' })
        .find('input')
        .trigger('input');
      expect(localStore.state.edit_modal.changes.title.value).toEqual('New Title');

      // Description
      wrapper
        .find({ ref: 'description' })
        .find('textarea')
        .setValue('New Description');
      wrapper
        .find({ ref: 'description' })
        .find('textarea')
        .trigger('input');
      expect(localStore.state.edit_modal.changes.description.value).toEqual('New Description');

      // Visibility
      wrapper
        .find({ ref: 'role_visibility' })
        .find('input')
        .setValue('learner');
      wrapper
        .find({ ref: 'role_visibility' })
        .find('input')
        .trigger('input');
      expect(localStore.state.edit_modal.changes.role_visibility.value).toEqual('learner');

      // License Description
      wrapper
        .find({ ref: 'license' })
        .find('textarea')
        .setValue('Test License Description');
      wrapper
        .find({ ref: 'license' })
        .find('textarea')
        .trigger('input');
      expect(localStore.state.edit_modal.changes.license_description.value).toEqual(
        'Test License Description'
      );
    });
    it('exercise fields should set selected node data extra_fields', () => {
      // Mastery Model
      wrapper
        .find({ ref: 'mastery_model' })
        .find({ ref: 'masteryModel' })
        .find('input')
        .setValue('m_of_n');
      wrapper
        .find({ ref: 'mastery_model' })
        .find({ ref: 'masteryModel' })
        .trigger('input');
      expect(localStore.state.edit_modal.changes.extra_fields.mastery_model.value).toEqual(
        'm_of_n'
      );
    });
    it('tags should set selected node data tags list', () => {
      wrapper.find({ ref: 'tags' }).vm.$emit('input', ['Tag X']);
      expect(localStore.state.edit_modal.changes.tags).toContain('Tag X');

      wrapper.find({ ref: 'tags' }).vm.$emit('input', ['Tag X', 'Tag Y']);
      expect(localStore.state.edit_modal.changes.tags).toContain('Tag X');
      expect(localStore.state.edit_modal.changes.tags).toContain('Tag Y');

      wrapper.find({ ref: 'tags' }).vm.$emit('input', ['Tag Y']);
      expect(localStore.state.edit_modal.changes.tags).not.toContain('Tag X');
      expect(localStore.state.edit_modal.changes.tags).toContain('Tag Y');
    });
  });
  describe('on validation', () => {
    describe('automatic validation', () => {
      it('should not automatically validate new items', async () => {
        DEFAULT_EXERCISE.isNew = true;
        DEFAULT_EXERCISE.title = null;

        // Need a few ticks for validation code to be called
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();
        expect(
          wrapper
            .find({ ref: 'title' })
            .find('.error--text')
            .exists()
        ).toBe(false);
        DEFAULT_EXERCISE.isNew = false;
        DEFAULT_EXERCISE.title = 'title';
      });
      it('should automatically validate existing items', async () => {
        DEFAULT_VIDEO.isNew = false;
        DEFAULT_VIDEO.title = null;
        localStore.commit('edit_modal/SET_NODE', videoIndex);

        // Need a few ticks for validation code to be called
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();
        expect(
          wrapper
            .find({ ref: 'title' })
            .find('.error--text')
            .exists()
        ).toBe(true);
      });
    });
    describe('field validation', () => {
      it('title should be marked as required if field is blank', async () => {
        localStore.commit('edit_modal/UPDATE_NODE', { title: null });
        wrapper.vm.$refs.form.validate();

        // Need a few ticks for validation code to be called
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();
        expect(
          wrapper
            .find({ ref: 'title' })
            .find('.error--text')
            .exists()
        ).toBe(true);
      });
      it('license should be marked as required if field is blank', async () => {
        localStore.commit('edit_modal/UPDATE_NODE', { license: null });
        wrapper.vm.$refs.form.validate();

        // Need a few ticks for validation code to be called
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();
        expect(
          wrapper
            .find({ ref: 'license' })
            .find('.error--text')
            .exists()
        ).toBe(true);
      });
      it('license should not be marked as required if freeze_authoring_data is true', async () => {
        DEFAULT_VIDEO.freeze_authoring_data = true;
        DEFAULT_VIDEO.license = null;
        localStore.commit('edit_modal/SET_NODE', videoIndex);
        wrapper.vm.$refs.form.validate();

        // Need a few ticks for validation code to be called
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();
        expect(
          wrapper
            .find({ ref: 'license' })
            .find('.error--text')
            .exists()
        ).toBe(false);
      });
      it('license description should be marked as required if license requires a description', async () => {
        DEFAULT_VIDEO.freeze_authoring_data = false;
        DEFAULT_VIDEO.license = specialPermissions.id;
        DEFAULT_VIDEO.license_description = null;
        localStore.commit('edit_modal/SET_NODE', videoIndex);
        wrapper.vm.$refs.form.validate();

        // Need a few ticks for validation code to be called
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();
        expect(
          wrapper
            .find({ ref: 'license' })
            .find({ ref: 'description' })
            .find('.error--text')
            .exists()
        ).toBe(true);
      });
      it('license description should not be marked as required if freeze_auth_data is true', async () => {
        DEFAULT_VIDEO.freeze_authoring_data = true;
        DEFAULT_VIDEO.license = specialPermissions.id;
        DEFAULT_VIDEO.license_description = null;
        localStore.commit('edit_modal/SET_NODE', videoIndex);
        wrapper.vm.$refs.form.validate();

        // Need a few ticks for validation code to be called
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();
        expect(
          wrapper
            .find({ ref: 'license' })
            .find({ ref: 'description' })
            .find('.error--text')
            .exists()
        ).toBe(false);
      });
      it('copyright_holder should be marked as required if license requires copyright holder', async () => {
        localStore.commit('edit_modal/UPDATE_NODE', {
          copyright_holder: null,
          license: specialPermissions.id,
        });
        wrapper.vm.$refs.form.validate();

        // Need a few ticks for validation code to be called
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();
        expect(
          wrapper
            .find({ ref: 'copyright_holder' })
            .find('.error--text')
            .exists()
        ).toBe(true);
      });
      it('copyright_holder should not be marked as required if freeze_auth_data is true', async () => {
        DEFAULT_VIDEO.freeze_authoring_data = true;
        DEFAULT_VIDEO.license = specialPermissions.id;
        DEFAULT_VIDEO.copyright_holder = null;
        localStore.commit('edit_modal/SET_NODE', videoIndex);
        wrapper.vm.$refs.form.validate();

        // Need a few ticks for validation code to be called
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();
        expect(
          wrapper
            .find({ ref: 'copyright_holder' })
            .find('.error--text')
            .exists()
        ).toBe(false);
      });
      it('mastery_model should be marked as required if node is an exercise', async () => {
        localStore.commit('edit_modal/UPDATE_EXTRA_FIELDS', { mastery_model: null });
        wrapper.vm.$refs.form.validate();

        // Need a few ticks for validation code to be called
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();
        expect(
          wrapper
            .find({ ref: 'mastery_model' })
            .find('.error--text')
            .exists()
        ).toBe(true);
      });
    });
  });
});
