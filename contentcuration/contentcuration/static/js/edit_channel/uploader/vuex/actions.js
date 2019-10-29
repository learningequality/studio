import _ from 'underscore';
import State from 'edit_channel/state';
import client from 'edit_channel/sharedComponents/client';
import { fileErrors } from 'edit_channel/file_upload/constants';

export function saveNodes(context) {
  // Setting this before in case changes happen between saving start and finish
  return new Promise((resolve, reject) => {
    let changed = _.where(context.state.nodes, { changesStaged: true });

    State.Store.dispatch('saveNodes', changed)
      .then(data => {
        context.commit('SET_LOADED_NODES', data);
        resolve();
      })
      .catch(reject);
  });
}

export function loadNodes(context, indices) {
  let nodes = _.filter(
    context.state.nodes,
    (node, i) => node.id && indices.includes(i) && !node._COMPLETE
  );
  if (nodes.length) {
    State.Store.dispatch('loadNodesComplete', _.pluck(nodes, 'id')).then(data => {
      context.commit('SET_LOADED_NODES', data);
    });
  }
}

/**
 * Validate node details and assessment items and save
 * validation results to state.validation.
 */
export const validateNode = ({ commit }, nodeIdx) => {
  commit('SANITIZE_NODE_ASSESSMENT_ITEMS', { nodeIdx });

  commit('VALIDATE_NODE_ASSESSMENT_ITEMS', { nodeIdx });
  commit('VALIDATE_NODE_DETAILS', { nodeIdx });
};

/**
 * Validate nodes and mark them as not new.
 */
export const prepareForSave = ({ dispatch, state }) => {
  state.nodes.forEach((node, nodeIdx) => {
    dispatch('validateNode', nodeIdx);
    node.isNew = false;
  });
};

export function removeNode(context, index) {
  let node = context.state.nodes[index];
  if (node.id) {
    State.Store.dispatch('deleteNodes', [node.id]).then(() => {
      context.commit('REMOVE_NODE', index);
    });
  } else {
    context.commit('REMOVE_NODE', index);
  }
}

export function copyNodes(context) {
  return new Promise(resolve => {
    let payload = { nodeIDs: _.pluck(context.state.nodes, 'id') };
    State.Store.dispatch('copyNodes', payload).then(data => {
      resolve(data);
    });
  });
}

/* UPLOAD ACTIONS */
export function getUploadURL(context, payload) {
  return new Promise((resolve, reject) => {
    client
      .get(
        window.Urls.get_upload_url(),
        { params: payload },
        {
          headers: {
            'Content-type': 'application/form-url-encode',
          },
        }
      )
      .then(resolve)
      .catch(error => {
        let errorData = {
          fileID: payload.id,
        };
        switch (error.response && error.response.status) {
          case 418:
            errorData.error = fileErrors.NO_STORAGE;
            break;
          default:
            errorData.error = fileErrors.UPLOAD_FAILED;
        }
        context.commit('SET_FILE_ERROR', errorData);
        reject(error);
      });
  });
}

export function uploadFile(context, payload) {
  return new Promise((resolve, reject) => {
    const data = new FormData();
    data.append('file', payload.file);
    client
      .post(payload.url, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: progressEvent => {
          const { loaded, total } = progressEvent;
          context.commit('SET_FILE_UPLOAD_PROGRESS', {
            fileID: payload.id,
            progress: (loaded / total) * 100,
          });
        },
      })
      .then(response => {
        context.commit('SET_FILE_PATH', {
          fileID: payload.id,
          path: response.data,
        });
        resolve(response);
      })
      .catch(reject);
  });
}
