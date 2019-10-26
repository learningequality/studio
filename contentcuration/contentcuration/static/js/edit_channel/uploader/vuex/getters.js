import _ from 'underscore';

import { getSelected } from './utils';
import State from 'edit_channel/state';

/**
 * Return assessment items of a node with a given index.
 */
const _nodeAssessmentItems = (state, nodeIdx) => {
  if (!state.nodes[nodeIdx].assessment_items) {
    return [];
  }

  return state.nodes[nodeIdx].assessment_items;
};

/**
 * Return errors of a node with a given index.
 * Return `null` if there are no validation data for the node.
 */
const _nodeErrors = (state, nodeIdx) => {
  const nodeValidation = state.validation.find(validation => validation.nodeIdx === nodeIdx);

  if (!nodeValidation || !nodeValidation.errors) {
    return null;
  }

  return nodeValidation.errors;
};

/**
 * Return a number of invalid assessment items of a node with a given index.
 */
const _invalidNodeAssessmentItemsCount = (state, nodeIdx) => {
  const nodeErrors = _nodeErrors(state, nodeIdx);

  if (nodeErrors === null) {
    return 0;
  }

  if (!nodeErrors.assessment_items || !nodeErrors.assessment_items.length) {
    return 0;
  }

  return nodeErrors.assessment_items.reduce((accumulator, itemValidation) => {
    return itemValidation.length ? accumulator + 1 : accumulator;
  }, 0);
};

/**
 * Return `true`/`false` if node details (title, description, license etc.)
 * are valid/invalid.
 */
const _areNodeDetailsValid = (state, nodeIdx) => {
  const nodeErrors = _nodeErrors(state, nodeIdx);

  if (nodeErrors === null) {
    return true;
  }

  return !nodeErrors.details || nodeErrors.details.length === 0;
};

/**
 * Return `false` if there is at least one assessment item of a node with a given index
 * that is invalid. Return `true` if all assessment items of the node are valid.
 */
const _areNodeAssessmentItemsValid = (state, nodeIdx) => {
  return _invalidNodeAssessmentItemsCount(state, nodeIdx) === 0;
};

/**
 * Return `true` if both details and assessment items of a given node are valid.
 * Otherwise return `false`.
 */
const _isNodeValid = (state, nodeIdx) => {
  return _areNodeDetailsValid(state, nodeIdx) && _areNodeAssessmentItemsValid(state, nodeIdx);
};

export function getNode(state) {
  return function(index) {
    return state.nodes[index];
  };
}

export function selected(state) {
  return getSelected(state);
}

export function allExercises(state) {
  let selected = getSelected(state);
  return _.every(selected, { kind: 'exercise' });
}

export function allResources(state) {
  let selected = getSelected(state);
  return !_.some(selected, { kind: 'topic' });
}

export function changed(state) {
  return _.some(state.nodes, { changesStaged: true });
}

// TODO: Remove this once hooked up to actual state
export function authors() {
  return ['Alakazam', 'Arbok', 'Articuno', 'Aerodactyl'];
}

export function providers() {
  return ['Pikachu', 'Pidgey', 'Pinsir'];
}

export function aggregators() {
  return [];
}

export function copyrightHolders() {
  return ['Charizard', 'Clefairy', 'Cloyster', 'Caterpie'];
}

export function tags() {
  return _.pluck(State.Store.getters.contentTags, 'tag_name');
}

/**
 * See _nodeAssessmentItems
 */
export const nodeAssessmentItems = state => nodeIdx => {
  return _nodeAssessmentItems(state, nodeIdx);
};

/**
 * See _nodeErrors
 */
export const nodeErrors = state => nodeIdx => {
  return _nodeErrors(state, nodeIdx);
};

/**
 * See _invalidNodeAssessmentItemsCount
 */
export const invalidNodeAssessmentItemsCount = state => nodeIdx => {
  return _invalidNodeAssessmentItemsCount(state, nodeIdx);
};

/**
 * Return number of assessment items of a node with a given index.
 */
export const nodeAssessmentItemsCount = state => nodeIdx => {
  return _nodeAssessmentItems(state, nodeIdx).length;
};

/**
 * See _areNodeDetailsValid
 */
export const areNodeDetailsValid = state => nodeIdx => {
  return _areNodeDetailsValid(state, nodeIdx);
};

/**
 * See _areNodeAssessmentItemsValid
 */
export const areNodeAssessmentItemsValid = state => nodeIdx => {
  return _areNodeAssessmentItemsValid(state, nodeIdx);
};

/**
 * See _isNodeValid
 */
export const isNodeValid = state => nodeIdx => {
  return _isNodeValid(state, nodeIdx);
};

export const isNodeNew = state => nodeIdx => {
  return state.nodes[nodeIdx].isNew;
};

/**
 * Returns an array of invalid nodes indices.
 * @param {Boolean} ignoreNewNodes All nodes marked as new will be skipped
 *                                 if set to `true`.
 */
export const invalidNodes = state => ({ ignoreNewNodes = false } = {}) => {
  return state.nodes
    .map((node, nodeIdx) => {
      if (ignoreNewNodes && node.isNew) {
        return undefined;
      }

      if (!_isNodeValid(state, nodeIdx)) {
        return nodeIdx;
      }

      return undefined;
    })
    .filter(nodeIdx => nodeIdx !== undefined);
};
