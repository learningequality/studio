import _ from 'underscore';
import { modes } from '../constants';
import { getSelected, isAssessmentItemInvalid } from './utils';
import Constants from 'edit_channel/constants/index';
import State from 'edit_channel/state';

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

function _validateNode(node, index) {
  // Title is required
  if (!node.title) return index;

  // Authoring information is required for resources
  if (!node.freeze_authoring_data && node.kind !== 'topic') {
    let license =
      node.license && _.findWhere(Constants.Licenses, { id: node.license.id || node.license });
    // License is required
    if (!license) return index;
    // Copyright holder is required for certain licenses
    else if (license.copyright_holder_required && !node.copyright_holder) return index;
    // License description is required for certain licenses
    else if (license.is_custom && !node.license_description) return index;
  }

  // Mastery is required on exercises
  if (node.kind === 'exercise') {
    let mastery = node.extra_fields;
    if (!mastery.mastery_model) return index;
    else if (
      mastery.mastery_model === 'm_of_n' &&
      (!mastery.m || !mastery.n || mastery.m > mastery.n)
    )
      return index;
  }

  return -1;
}

export function invalidNodes(state) {
  // Skip validation on view only mode
  if (state.mode === modes.VIEW_ONLY) return [];

  return _.chain(state.nodes)
    .map((node, index) => {
      // Don't automatically validate new nodes
      if (node.isNew) return -1;
      return _validateNode(node, index);
    })
    .filter(num => num !== -1)
    .value();
}

export function invalidNodesOverridden(state) {
  return _.chain(state.nodes)
    .map(_validateNode)
    .filter(num => num !== -1)
    .value();
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
 * Return number of node assessment draft items if user has already started
 * editing the node. Otherwise return number of assessment items retrieved
 * from the last API call.
 * @param {*} state
 */
export const nodeAssessmentItemsCount = state => nodeId => {
  const nodeAssessmentDraft = state.nodesAssessmentDrafts[nodeId];

  if (nodeAssessmentDraft !== undefined) {
    return nodeAssessmentDraft.length;
  }

  const node = state.nodes.find(node => node.id === nodeId);
  if (node === undefined) {
    return 0;
  }

  return node.assessment_items.length;
};

export const nodeAssessmentDraft = state => nodeId => {
  if (!Object.keys(state.nodesAssessmentDrafts).includes(nodeId)) {
    return null;
  }

  return state.nodesAssessmentDrafts[nodeId];
};

export const isNodeAssessmentDraftValid = state => nodeId => {
  const nodeAssessmentDraft = state.nodesAssessmentDrafts[nodeId];

  return !nodeAssessmentDraft.some(isAssessmentItemInvalid);
};

export const invalidNodeAssessmentDraftItemsCount = state => nodeId => {
  const nodeAssessmentDraft = state.nodesAssessmentDrafts[nodeId];

  return nodeAssessmentDraft.filter(isAssessmentItemInvalid).length;
};
