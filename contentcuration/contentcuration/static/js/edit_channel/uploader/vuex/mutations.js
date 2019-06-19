import _ from 'underscore';
import { modes } from '../constants';
import { getSelected } from './utils';
import State from 'edit_channel/state';
import Constants from 'edit_channel/constants/index';

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

export function RESET_STATE(state) {
  Object.assign(state, {
    nodes: [],
    selectedIndices: [],
    isClipboard: false,
    changes: {},
    targetNode: { parent_title: 'Sandbox' },
    mode: modes.VIEW_ONLY,
  });
}

export function SET_NODES(state, nodes) {
  _.each(nodes, node => {
    node.changesStaged = false;
    node.loaded = false;
    // node.copyright_holder = null;
  });
  state.nodes = nodes;
}

export function SET_MODE(state, mode) {
  state.mode = mode;
}

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

  state.changes.tags = _.intersection.apply(_, _.pluck(selected, 'tags'));
  _.each(state.nodes, (node, i) => {
    if (!_.contains(state.selectedIndices, i)) node.isNew = false;
  });
}

export function PREP_NODES_FOR_SAVE(state) {
  _.each(state.nodes, node => (node.isNew = false));
}

export function SET_LOADED_NODES(state, nodes) {
  _.each(nodes, node => {
    let match = _.findWhere(state.nodes, { id: node.id });
    _.extendOwn(match, {
      ...node,
      loaded: true,
      // copyright_holder: null,
    });
  });
  _.defer(() => {
    SET_CHANGES(state);
  });
}

export function RESET_SELECTED(state) {
  _.defer(() => {
    state.selectedIndices = [];
    state.changes = {};
  });
}

export function SET_SELECTED(state, payload) {
  _.defer(() => {
    state.selectedIndices = payload;
    SET_CHANGES(state);
  });
}

export function SET_NODE(state, index) {
  _.defer(() => {
    state.selectedIndices = [index];
    SET_CHANGES(state);
  });
}

export function SELECT_NODE(state, index) {
  _.defer(() => {
    state.selectedIndices.push(index);
    SET_CHANGES(state);
  });
}

export function DESELECT_NODE(state, index) {
  _.defer(() => {
    state.selectedIndices = _.reject(state.selectedIndices, i => i === index);
    SET_CHANGES(state);
  });
}

export function SELECT_ALL_NODES(state) {
  _.defer(() => {
    state.selectedIndices = _.range(state.nodes.length);
    SET_CHANGES(state);
  });
}

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
    loaded: true,
    changesStaged: true,
    isNew: true,
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

// Form fields
export function SET_FIELD(state, fieldName, value) {
  state.changes[fieldName].value = value;
  state.changes[fieldName].varied = false;
  let selected = getSelected(state);
  _.each(selected, node => {
    if (!_.isEqual(node[fieldName], value)) {
      node[fieldName] = value;
      node.changed = true;
      node.changesStaged = true;
    }
  });
}

export function SET_TITLE(state, title) {
  SET_FIELD(state, 'title', title);
}

export function SET_LANGUAGE(state, language) {
  SET_FIELD(state, 'language', language);
}

export function SET_DESCRIPTION(state, description) {
  SET_FIELD(state, 'description', description);
}

export function SET_LICENSE(state, license) {
  SET_FIELD(state, 'license', license);
}

export function SET_LICENSE_DESCRIPTION(state, description) {
  SET_FIELD(state, 'license_description', description);
}

export function SET_COPYRIGHT_HOLDER(state, copyrightHolder) {
  SET_FIELD(state, 'copyright_holder', copyrightHolder);
}

export function SET_AUTHOR(state, author) {
  SET_FIELD(state, 'author', author);
}

export function SET_PROVIDER(state, provider) {
  SET_FIELD(state, 'provider', provider);
}

export function SET_AGGREGATOR(state, aggregator) {
  SET_FIELD(state, 'aggregator', aggregator);
}

export function SET_VISIBILITY(state, role) {
  SET_FIELD(state, 'role_visibility', role);
}

export function SET_TAGS(state, tags) {
  let removed = _.difference(state.changes.tags, tags);
  let selected = getSelected(state);
  _.each(selected, node => {
    // Node tags + new tags - old tags
    node.tags = _.chain(node.tags)
      .union(tags)
      .difference(removed)
      .value();
    node.changesStaged = true;
    node.changed = true;
  });
  state.changes.tags = tags;

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
}

export function SET_EXTRA_FIELDS(state, obj) {
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
