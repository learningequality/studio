import _ from 'underscore';
import Vue from 'vue';

import { modes, AssessmentItemTypes } from '../constants';
import { getSelected } from './utils';
import State from 'edit_channel/state';
import Constants from 'edit_channel/constants/index';

export function RESET_STATE(state) {
  Object.assign(state, {
    nodes: [],
    selectedIndices: [],
    changes: {},
    mode: modes.VIEW_ONLY,
  });
}

export function SET_MODE(state, mode) {
  state.mode = mode;
}

/*********** AGGREGATE CHANGES ***********/

const editableFields = [
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

const extraFields = ['mastery_model', 'm', 'n', 'randomize'];

function _generateSharedData(items, fields) {
  return _.reduce(
    fields,
    (sharedData, field) => {
      let values = _.pluck(items, field);
      let allIdentical = items.length === 1 || _.every(values, f => f === values[0]);
      sharedData[field] = {
        value: allIdentical ? values[0] : null,
        varied: !allIdentical, // Indicate items differ in values for this field
      };
      return sharedData;
    },
    {}
  );
}

export function SET_CHANGES(state) {
  state.changes = {};
  let selected = getSelected(state);
  state.changes = _generateSharedData(selected, editableFields);

  let extraFieldItems = _.pluck(selected, 'extra_fields');
  state.changes.extra_fields = _generateSharedData(extraFieldItems, extraFields);

  let tags = _.map(selected, n => _.pluck(n.tags, 'tag_name'));
  state.changes.tags = _.intersection.apply(_, tags);
  _.each(state.nodes, (node, i) => {
    if (!_.contains(state.selectedIndices, i)) node.isNew = false;
  });
}

/*********** SET NODES ***********/

export function SET_NODES(state, nodes) {
  _.each(nodes, node => {
    node.changesStaged = false;
    node['_COMPLETE'] = false;
  });

  state.nodes = nodes;
}

export function SET_LOADED_NODES(state, nodes) {
  _.each(_.values(nodes), value => {
    // First, try to find a matching id. If none exists (i.e. the node is new), use sort_order
    let match =
      _.findWhere(state.nodes, { id: value.id }) ||
      _.findWhere(state.nodes, { sort_order: value.sort_order });
    if (match) {
      _.extendOwn(match, value);
      match.changesStaged = false;
      match['_COMPLETE'] = true;
    }
  });

  _.defer(() => SET_CHANGES(state));
}

/*********** SELECT NODES ***********/

export function RESET_SELECTED(state) {
  state.selectedIndices = [];
  state.changes = {};
}

export function SET_SELECTED(state, payload) {
  state.selectedIndices = payload;
  SET_CHANGES(state);
}

export function SET_NODE(state, index) {
  state.selectedIndices = [index];
  SET_CHANGES(state);
}

export function SELECT_NODE(state, index) {
  state.selectedIndices.push(index);
  SET_CHANGES(state);
}

export function DESELECT_NODE(state, index) {
  state.selectedIndices = _.reject(state.selectedIndices, i => i === index);
  SET_CHANGES(state);
}

export function SELECT_ALL_NODES(state) {
  state.selectedIndices = _.range(state.nodes.length);
  SET_CHANGES(state);
}

/*********** SET FIELDS ***********/

export function UPDATE_NODE(state, payload) {
  let selected = getSelected(state);
  _.each(selected, node => {
    _.assign(node, payload);
    node.changed = true;
    node.changesStaged = true;
  });
  SET_CHANGES(state);
}

export function SET_TAGS(state, tags) {
  let removed = _.difference(state.changes.tags, tags);
  let selected = getSelected(state);

  _.each(selected, node => {
    // Node tags + new tags - old tags
    node.tags = _.chain(node.tags)
      .map(t => t.tag_name || t) // Loaded values are in dict form,
      .union(tags)
      .difference(removed)
      .map(t => ({ tag_name: t, channel: State.current_channel.id }))
      .value();
    node.changesStaged = true;
    node.changed = true;
  });

  let newTags = _.difference(tags, State.Store.getters.contentTags);
  _.each(newTags, tag => {
    State.Store.commit('ADD_CONTENT_TAG', {
      tag_name: tag,
      channel: State.current_channel.id,
    });
  });
  _.each(removed, tag => {
    State.Store.commit('REMOVE_CONTENT_TAG_BY_NAME', tag);
  });
  SET_CHANGES(state);
}

export function UPDATE_EXTRA_FIELDS(state, obj) {
  let selected = getSelected(state);
  _.each(selected, node => {
    if (!_.isEqual(node.extra_fields, obj)) {
      _.assign(node.extra_fields, obj);
      node.changed = true;
      node.changesStaged = true;
    }
  });
  SET_CHANGES(state);
}

/*********** NODE OPERATIONS ***********/

export function ADD_NODE(state, payload) {
  let preferences = payload.kind === 'topic' ? {} : State.preferences;
  let data = _.reduce(
    editableFields,
    (dict, field) => {
      switch (field) {
        case 'license':
          dict.license = _.findWhere(Constants.Licenses, { license_name: preferences.license });
          dict.license = (dict.license && dict.license.id) || null;
          break;
        default:
          dict[field] = preferences[field];
      }
      return dict;
    },
    {}
  );
  let extraFieldData = _.reduce(
    extraFields,
    (dict, field) => {
      switch (field) {
        case 'm':
          dict.m = preferences.m_value || null;
          break;
        case 'n':
          dict.n = preferences.n_value || null;
          break;
        default:
          dict[field] = preferences[field];
      }
      return dict;
    },
    {}
  );
  state.nodes.push({
    ...data,
    files: [],
    assessment_items: [],
    prerequisite: [],
    ancestors: [],
    extra_fields: extraFieldData,
    tags: [],
    role_visibility: 'learner',
    changesStaged: true,
    isNew: true,
    parent: State.currentNode.id,
    sort_order: State.currentNode.metadata.max_sort_order + state.nodes.length + 1,
    _COMPLETE: true,
    ...payload,
  });
  _.defer(() => {
    // Wait for node to render
    state.selectedIndices = [state.nodes.length - 1];
    SET_CHANGES(state);
  });
}

export function REMOVE_NODE(state, index) {
  state.nodes = _.reject(state.nodes, (n, i) => i === index);
  state.selectedIndices = _.reject(state.selectedIndices, i => i === index);
  SET_CHANGES(state);
}

export function PREP_NODES_FOR_SAVE(state) {
  _.each(state.nodes, node => (node.isNew = false));
}

/**
 * Save assessment items to draft store in format suitable for any further work -
 * parse stringified data and make sure that everything is properly sorted by order.
 */
export const addNodeAssessmentDraft = (state, { nodeId, assessmentItems }) => {
  let items = [];

  if (assessmentItems && assessmentItems.length) {
    items = JSON.parse(JSON.stringify(assessmentItems));
  }

  items = items.map(item => {
    let answers = [];

    // API returns answers as string
    if (item.answers) {
      answers = JSON.parse(item.answers);
    }

    answers.sort((answer1, answer2) => (answer1.order > answer2.order ? 1 : -1));

    return {
      ...item,
      answers,
    };
  });

  items.sort((item1, item2) => (item1.order > item2.order ? 1 : -1));

  Vue.set(state.nodesAssessmentDrafts, nodeId, items);
};

export const addNodeAssessmentDraftItem = (state, nodeId) => {
  if (!state.nodesAssessmentDrafts[nodeId]) {
    Vue.set(state.nodesAssessmentDrafts, nodeId, []);
  }

  const nodeAssessmentDraft = [...state.nodesAssessmentDrafts[nodeId]];
  nodeAssessmentDraft.push({
    question: '',
    type: AssessmentItemTypes.SINGLE_SELECTION,
    order: nodeAssessmentDraft.length,
  });

  Vue.set(state.nodesAssessmentDrafts, nodeId, nodeAssessmentDraft);
};

export const updateNodeAssessmentDraftItem = (state, { nodeId, assessmentItemIdx, data }) => {
  const nodeAssessmentDraft = [...state.nodesAssessmentDrafts[nodeId]];

  nodeAssessmentDraft[assessmentItemIdx] = {
    ...nodeAssessmentDraft[assessmentItemIdx],
    ...data,
  };

  Vue.set(state.nodesAssessmentDrafts, nodeId, nodeAssessmentDraft);
};
