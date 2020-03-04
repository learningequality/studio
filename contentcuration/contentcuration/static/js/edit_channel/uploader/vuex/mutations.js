// import _ from 'underscore';
// import Vue from 'vue';

// import { sanitizeFiles, validateNodeFiles } from '../utils';

/**
 * Sanitize files of a node with a given index.
 */
// export const SANITIZE_NODE_FILES = (state, { nodeIdx }) => {
//   let files = [];

//   if (state.nodes[nodeIdx].files && state.nodes[nodeIdx]['_COMPLETE']) {
//     files = [...state.nodes[nodeIdx].files];
//   }

//   const sanitizedFiles = sanitizeFiles(files);
//   Vue.set(state.nodes[nodeIdx], 'files', sanitizedFiles);
// };

/**
 * Validate node files and save validation results
 * to state.validation.
 */
// export const VALIDATE_NODE_FILES = (state, { nodeIdx }) => {
//   // cleanup previous node details validation
//   // setup a new node validation object if there is none
//   const previousValidationIdx = state.validation.findIndex(
//     nodeValidation => nodeValidation.nodeIdx === nodeIdx
//   );
//   let validationIdx;
//   if (previousValidationIdx === -1) {
//     state.validation.push({
//       nodeIdx,
//       errors: {},
//     });
//     validationIdx = state.validation.length - 1;
//   } else {
//     Vue.set(state.validation[previousValidationIdx].errors, 'files', []);
//     validationIdx = previousValidationIdx;
//   }

//   const node = state.nodes[nodeIdx];

//   Vue.set(state.validation[validationIdx].errors, 'files', validateNodeFiles(node));
// };

// export function PREP_NODES_FOR_SAVE(state) {
//   _.each(state.nodes, node => (node.isNew = false));
// }

/*********** FILE OPERATIONS ***********/

// export function ADD_NODES_FROM_FILES(state, newFiles) {
//   newFiles.forEach(file => {
//     ADD_NODE(state, {
//       title: file.name,
//       kind: file.kind,
//       metadata: {
//         resource_size: file.file_size,
//       },
//       files: [file],
//     });
//   });
// }

export function ADD_FILE_TO_NODE(state, payload) {
  if (payload.file) {
    state.nodes[payload.index].files = _.reject(state.nodes[payload.index].files, f => {
      return (
        f.preset.id === payload.file.preset.id &&
        (!payload.file.preset.multi_language || payload.file.language.id === f.language.id)
      );
    });
    state.nodes[payload.index].files.push(payload.file);
    state.nodes[payload.index].changesStaged = true;
  }
}

export function REMOVE_FILE_FROM_NODE(state, payload) {
  state.nodes[payload.index].files = _.reject(state.nodes[payload.index].files, f => {
    return f.id === payload.fileID;
  });
  state.nodes[payload.index].changesStaged = true;
}
