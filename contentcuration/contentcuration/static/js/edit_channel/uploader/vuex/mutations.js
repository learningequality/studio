import _ from 'underscore';
import { getSelected } from './utils';
import State from 'edit_channel/state';

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

const extraFields = ['mastery_model', 'm', 'n'];

export function RESET_STATE(state) {
  Object.assign(state, {
    nodes: [],
    selectedIndices: [],
    viewOnly: false,
    isClipboard: false,
    changes: {},
    targetNode: {},
    changed: false,
    isValid: true,
  });
}

export function SET_NODES(state, nodes) {
  _.each(nodes, node => {
    node.changesStaged = false;
    node.loaded = false;
  });
  state.nodes = nodes;
}

export function SET_VALID(state, isValid) {
  state.isValid = isValid;
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
}

export function SET_LOADED_NODES(state, nodes) {
  _.each(nodes, node => {
    let match = _.findWhere(state.nodes, { id: node.id });
    _.extendOwn(match, {
      ...node,
      loaded: true,
    });
  });
}

export function RESET_SELECTED(state) {
  _.defer(() => {
    state.selectedIndices = [];
    state.changes = {};
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
  let data = _.reduce(
    editableFields,
    (dict, field) => {
      dict[field] = null;
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
    extra_fields: {},
    tags: [],
    role_visibility: 'learner',
    loaded: true,
    changesStaged: true,
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
}

// Form fields
export function SET_FIELD(state, fieldName, value) {
  // console.log(fieldName, value)
  state.changes[fieldName].value = value;
  state.changes[fieldName].varied = false;
  state.changes.changed = true;
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
  });
  state.changes.changed = true;
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
  _.defer(() => {
    let selected = getSelected(state);
    _.each(_.pairs(obj), pair => {
      state.changes.extra_fields[pair[0]].value = pair[1];
      state.changes.extra_fields[pair[0]].varied = false;
      state.changes.changed = true;

      // Update selected
      _.each(selected, node => {
        node[pair[0]] = pair[1];
        node.changed = true;
        node.changesStaged = true;
      });
    });
  });
}
