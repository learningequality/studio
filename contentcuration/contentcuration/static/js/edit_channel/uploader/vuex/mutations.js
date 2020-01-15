import _ from 'underscore';
import Vue from 'vue';

import { modes } from '../constants';
import {
  sanitizeFiles,
  sanitizeAssessmentItems,
  validateNodeFiles,
  validateAssessmentItem,
  validateNodeDetails,
  parseNode,
} from '../utils';
import { getSelected } from './utils';
import State from 'edit_channel/state';
import Constants from 'edit_channel/constants/index';

export function RESET_STATE(state) {
  Object.assign(state, {
    nodes: [],
    selectedIndices: [],
    changes: {},
    mode: modes.VIEW_ONLY,
    files: [],
  });
}

export function SET_MODE(state, mode) {
  state.mode = mode;
}

export const OPEN_DIALOG = (state, { title, message, submitLabel, onSubmit, onCancel }) => {
  const closeDialog = () => {
    state.dialog = {
      open: false,
      title: '',
      message: '',
      submitLabel: '',
      onSubmit: () => {},
      onCancel: () => {},
    };
  };

  state.dialog = {
    open: true,
    title,
    message,
    submitLabel,
    onSubmit: () => {
      if (typeof onSubmit === 'function') {
        onSubmit();
      }
      closeDialog();
    },
    onCancel: () => {
      if (typeof onCancel === 'function') {
        onCancel();
      }
      closeDialog();
    },
  };
};

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

  if (state.selectedIndices) {
    let tags = _.map(selected, n => _.pluck(n.tags, 'tag_name'));
    state.changes.tags = _.intersection.apply(_, tags);
  } else {
    state.changes.tags = [];
  }

  _.each(state.nodes, (node, i) => {
    if (!state.selectedIndices.includes(i)) node.isNew = false;
  });
}

/*********** SET NODES ***********/

export function SET_NODES(state, nodes) {
  _.each(nodes, node => {
    node = parseNode(node);
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
      _.extendOwn(match, parseNode(value));
      match.changesStaged = false;
      match['_COMPLETE'] = true;
    }
  });

  _.defer(() => SET_CHANGES(state));
}

/**
 * Save new assessment items data to a node with a given index
 * in an array of all nodes.
 */
export const SET_NODE_ASSESSMENT_ITEMS = (state, { nodeIdx, assessmentItems }) => {
  const nodes = [...state.nodes];

  nodes[nodeIdx] = {
    ...nodes[nodeIdx],
    assessment_items: assessmentItems,
  };

  Vue.set(state, 'nodes', nodes);
};

/*********** VALIDATE NODES ***********/

/**
 * Sanitize assessment items of a node with a given index.
 */
export const SANITIZE_NODE_ASSESSMENT_ITEMS = (state, { nodeIdx }) => {
  let assessmentItems = [];

  if (state.nodes[nodeIdx].assessment_items) {
    assessmentItems = [...state.nodes[nodeIdx].assessment_items];
  }
  const sanitizedAssessmentItems = sanitizeAssessmentItems(assessmentItems);

  Vue.set(state.nodes[nodeIdx], 'assessment_items', sanitizedAssessmentItems);
};

/**
 * Sanitize files of a node with a given index.
 */
export const SANITIZE_NODE_FILES = (state, { nodeIdx }) => {
  let files = [];

  if (state.nodes[nodeIdx].files && state.nodes[nodeIdx]['_COMPLETE']) {
    files = [...state.nodes[nodeIdx].files];
  }

  const sanitizedFiles = sanitizeFiles(files);
  Vue.set(state.nodes[nodeIdx], 'files', sanitizedFiles);
};

/**
 * Validate node details (title, licence etc.) and save validation results
 * to state.validation.
 */
export const VALIDATE_NODE_DETAILS = (state, { nodeIdx }) => {
  // cleanup previous node details validation
  // setup a new node validation object if there is none
  const previousValidationIdx = state.validation.findIndex(
    nodeValidation => nodeValidation.nodeIdx === nodeIdx
  );
  let validationIdx;
  if (previousValidationIdx === -1) {
    state.validation.push({
      nodeIdx,
      errors: {},
    });
    validationIdx = state.validation.length - 1;
  } else {
    Vue.set(state.validation[previousValidationIdx].errors, 'details', []);
    validationIdx = previousValidationIdx;
  }

  const node = state.nodes[nodeIdx];

  Vue.set(state.validation[validationIdx].errors, 'details', validateNodeDetails(node));
};

/**
 * Validate node files and save validation results
 * to state.validation.
 */
export const VALIDATE_NODE_FILES = (state, { nodeIdx }) => {
  // cleanup previous node details validation
  // setup a new node validation object if there is none
  const previousValidationIdx = state.validation.findIndex(
    nodeValidation => nodeValidation.nodeIdx === nodeIdx
  );
  let validationIdx;
  if (previousValidationIdx === -1) {
    state.validation.push({
      nodeIdx,
      errors: {},
    });
    validationIdx = state.validation.length - 1;
  } else {
    Vue.set(state.validation[previousValidationIdx].errors, 'files', []);
    validationIdx = previousValidationIdx;
  }

  const node = state.nodes[nodeIdx];

  Vue.set(state.validation[validationIdx].errors, 'files', validateNodeFiles(node));
};

/**
 * Validate node assessment items and save validation results
 * to state.validation.
 */
export const VALIDATE_NODE_ASSESSMENT_ITEMS = (state, { nodeIdx }) => {
  // cleanup previous node assessment items validation
  // setup a new node validation object if there is none
  const previousValidationIdx = state.validation.findIndex(
    nodeValidation => nodeValidation.nodeIdx === nodeIdx
  );
  let validationIdx;
  if (previousValidationIdx === -1) {
    state.validation.push({
      nodeIdx,
      errors: {},
    });
    validationIdx = state.validation.length - 1;
  } else {
    Vue.set(state.validation[previousValidationIdx].errors, 'assessment_items', []);
    validationIdx = previousValidationIdx;
  }

  if (!state.nodes[nodeIdx].assessment_items || !state.nodes[nodeIdx].assessment_items.length) {
    return;
  }

  const assessmentItems = state.nodes[nodeIdx].assessment_items;
  const assessmentItemsErrors = [];

  assessmentItems.forEach(item => {
    assessmentItemsErrors.push(validateAssessmentItem(item));
  });

  Vue.set(state.validation[validationIdx].errors, 'assessment_items', assessmentItemsErrors);
};

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
  let preferences = payload.kind === 'topic' ? {} : window.preferences;
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
    parent: state.currentNode.id,
    sort_order: state.currentNode.metadata.max_sort_order + state.nodes.length + 1,
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

/*********** FILE OPERATIONS ***********/

export function SET_FILES(state, file) {
  state.nodes.forEach(node => {
    let match = _.where(node.files, { id: file.id });
    if (match) {
      _.assign(match, file);
    }
  });
}

export function ADD_NODES_FROM_FILES(state, newFiles) {
  newFiles.forEach(file => {
    ADD_NODE(state, {
      title: file.name,
      kind: file.kind,
      metadata: {
        resource_size: file.file_size,
      },
      files: [file],
    });
  });
}

export function ADD_FILE_TO_NODE(state, payload) {
  if (payload.file) {
    state.nodes[payload.index].files = _.reject(state.nodes[payload.index].files, f => {
      return f.preset.id === payload.file.preset.id;
    });
    state.nodes[payload.index].files.push(payload.file);
    state.nodes[payload.index].changesStaged = true;
    SET_CHANGES(state);
  }
}

export function REMOVE_FILE_FROM_NODE(state, payload) {
  state.nodes[payload.index].files = _.reject(state.nodes[payload.index].files, f => {
    return f.id === payload.fileID;
  });
  state.nodes[payload.index].changesStaged = true;
  SET_CHANGES(state);
}
