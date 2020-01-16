import { contentNodeLastSavedState } from './index';
import { isTempId } from 'shared/utils';
import client from 'shared/client';

export function loadSummaryContentNodes(context, params) {
  return client.get(window.Urls['summarycontentnode-list'](), { params }).then(response => {
    const contentNodes = response.data;
    context.commit('ADD_CONTENTNODES', { contentNodes });
    return contentNodes;
  });
}

export function loadSummaryContentNode(context, id) {
  return client
    .get(window.Urls['summarycontentnode-detail'](id))
    .then(response => {
      const contentNode = response.data;
      context.commit('ADD_CONTENTNODE', { contentNode });
      return contentNode;
    })
    .catch(() => {
      return;
    });
}

export function loadContentNodes(context, params) {
  return client.get(window.Urls['contentnode-list'](), { params }).then(response => {
    const contentNodes = response.data;
    context.commit('ADD_CONTENTNODES', { contentNodes, complete: true });
    return contentNodes;
  });
}

export function loadContentNode(context, id) {
  return client
    .get(window.Urls['contentnode-detail'](id))
    .then(response => {
      const contentNode = response.data;
      context.commit('ADD_CONTENTNODE', { contentNode, complete: true });
      return contentNode;
    })
    .catch(() => {
      return;
    });
}

/* CONTENTNODE EDITOR ACTIONS */
export function saveContentNode(context, contentNodeId) {
  if (context.getters.getContentNodeIsValid(contentNodeId)) {
    const contentNodeData = contentNodeLastSavedState.getUnsavedChanges(
      context.getters.getContentNode(contentNodeId)
    );
    if (Object.keys(contentNodeData).length) {
      if (isTempId(contentNodeId)) {
        if (!contentNodeData.editors || contentNodeData.editors.length === 0) {
          contentNodeData.editors = [context.rootGetters.currentUserId];
        }
        delete contentNodeData.id;
        return client.post(window.Urls['contentnode-list'](), contentNodeData).then(response => {
          const contentNode = response.data;
          context.commit('ADD_CONTENTNODE', { contentNode, complete: true });
          context.commit('REMOVE_CONTENTNODE', contentNodeId);
          return contentNode.id;
        });
      }

      return client
        .patch(window.Urls['contentnode-detail'](contentNodeId), contentNodeData)
        .then(response => {
          // If successful the data will just be true,
          // so update our last saved state with the current vuex state.
          if (response.data) {
            contentNodeLastSavedState.storeLastSavedState(
              context.getters.getContentNode(contentNodeId)
            );
          }
          return null;
        });
    }
  }
}

export function deleteContentNode(context, contentNodeId) {
  return client
    .patch(window.Urls['contentnode-detail'](contentNodeId), { deleted: true })
    .then(() => {
      context.commit('REMOVE_CONTENTNODE', contentNodeId);
    });
}
