import _ from 'underscore';
import Vue from 'vue';
import Constants from 'edit_channel/constants';

const Vuex = require('vuex');
var mutations = require('edit_channel/uploader/vuex/mutations');
var getters = require('edit_channel/uploader/vuex/getters');
var actions = require('edit_channel/uploader/vuex/actions');
const fileUploadsModule = require('edit_channel/vuexModules/fileUpload');

Vue.use(Vuex);

export const editableFields = [
  'language',
  'title',
  'description',
  'license',
  'license_description',
  'copyright_holder',
  'author',
  'role_visibility',
  'aggregator',
  'provider',
];

let specialPermissions = _.findWhere(Constants.Licenses, { is_custom: true });
export function generateNode(props = {}) {
  let data = {};
  _.each(editableFields, f => {
    data[f] = Math.random()
      .toString(36)
      .substring(7);
  });

  let extra_fields = {
    mastery_model: 'do_all',
    randomize: false,
  };

  return {
    id: Math.random()
      .toString(36)
      .substring(7),
    kind: 'topic',
    prerequisite: [],
    is_prerequisite_of: [],
    files: [{ preset: {} }],
    metadata: { resource_size: 0 },
    assessment_items: [],
    extra_fields: extra_fields,
    tags: [],
    ancestors: [],
    ...data,
    ...props,
    license: specialPermissions.id,
    language: 'en-PT',
    role_visibility: 'coach',
  };
}

export const DEFAULT_TOPIC = generateNode({ kind: 'topic' });
export const DEFAULT_TOPIC2 = generateNode({ kind: 'topic' });
export const DEFAULT_VIDEO = generateNode({ kind: 'video' });
export const DEFAULT_EXERCISE = generateNode({ kind: 'exercise' });
export const DEFAULT_EXERCISE2 = generateNode({ kind: 'exercise' });

export const mockFunctions = {
  saveNodes: jest.fn(),
  removeNode: jest.fn(),
  copyNodes: jest.fn(),
  loadNodes: jest.fn(),
};

export const localStore = new Vuex.Store({
  modules: {
    edit_modal: {
      namespaced: true,
      state: {
        nodes: [],
        validation: [],
        selectedIndices: [],
        changes: {},
        mode: 'VIEW_ONLY',
      },
      getters: getters,
      mutations: {
        ...mutations,
        OPEN_DIALOG() {},
      },
      actions: {
        ...actions,
        loadNodes: context => {
          _.each(context.state.selectedIndices, i => {
            context.state.nodes[i]['_COMPLETE'] = true;
          });
          context.commit('SET_CHANGES');
          mockFunctions.loadNodes();
        },
        saveNodes: mockFunctions.saveNodes,
        removeNode: mockFunctions.removeNode,
        copyNodes: mockFunctions.copyNodes,
      },
    },
    fileUploads: fileUploadsModule,
  },
});
