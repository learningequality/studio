import Vue from 'vue';
import difference from 'lodash/difference';
import union from 'lodash/union';
import { contentNodeLastSavedState } from './index';

function mergeContentNode(contentNodesMap, contentNode) {
  contentNodeLastSavedState.storeLastSavedState(contentNode);
  return {
    ...contentNodesMap,
    [contentNode.id]: {
      ...contentNodesMap[contentNode.id],
      ...contentNode,
    },
  };
}

export function ADD_CONTENTNODE(state, contentNode) {
  state.contentNodesMap = mergeContentNode(state.contentNodesMap, contentNode);
}

export function ADD_CONTENTNODES(state, contentNodes = []) {
  state.contentNodesMap = contentNodes.reduce((contentNodesMap, contentNode) => {
    return mergeContentNode(contentNodesMap, contentNode);
  }, state.contentNodesMap);
}

export function REMOVE_CONTENTNODE(state, contentNodeId) {
  Vue.delete(state.contentNodesMap, contentNodeId);
}

export function UPDATE_CONTENTNODE(
  state,
  { id, title = null, description = null, thumbnailData = null, language = null, license = null, license_description = null, copyright_holder = null, author = null, role_visibility = null, aggregator = null, provider = null, extra_fields = null } = {}
) {
  if (!id) {
    throw ReferenceError('id must be defined to update a contentNode set');
  }
  const contentNode = state.contentNodesMap[id];
  if (title !== null) {
    contentNode.title = title;
  }
  if (description !== null) {
    contentNode.description = description;
  }
  if (
    thumbnailData !== null &&
    ['thumbnail', 'thumbnail_url', 'thumbnail_encoding'].every(attr => thumbnailData[attr])
  ) {
    contentNode.thumbnail = thumbnailData.thumbnail;
    contentNode.thumbnail_url = thumbnailData.thumbnail_url;
    contentNode.thumbnail_encoding = thumbnailData.thumbnail_encoding;
  }
  if (language !== null) {
    contentNode.language = language;
  }
  if (license !== null) {
    contentNode.license = license;
  }
  if (license_description !== null) {
    contentNode.license_description = license_description;
  }
  if (copyright_holder !== null) {
    contentNode.copyright_holder = copyright_holder;
  }
  if (author !== null) {
    contentNode.author = author;
  }
  if (role_visibility !== null) {
    contentNode.role_visibility = role_visibility;
  }
  if (aggregator !== null) {
    contentNode.aggregator = aggregator;
  }
  if (provider !== null) {
    contentNode.provider = provider;
  }
  if (extra_fields !== null) {
    if (extra_fields.mastery_model !== null) {
      contentNode.extra_fields.mastery_model = extra_fields.mastery_model;
    }
    if (extra_fields.m !== null) {
      contentNode.extra_fields.m = extra_fields.m;
    }
    if (extra_fields.n !== null) {
      contentNode.extra_fields.n = extra_fields.n;
    }
    if (extra_fields.randomize !== null) {
      contentNode.extra_fields.randomize = extra_fields.randomize;
    }
  }
}

export function UPDATE_CONTENTNODES(state, ids, payload) {
  ids.forEach(id => {
    UPDATE_CONTENTNODE(state, {
      id,
      ...payload,
    });
  });
}

export function ADD_TAGS(state, ids, tags) {
  ids.forEach(id => {
    const contentNode = state.contentNodesMap[id];
    contentNode.tags = union(contentNode.tags, tags);
  });
}

export function REMOVE_TAGS(state, ids, tags) {
  ids.forEach(id => {
    const contentNode = state.contentNodesMap[id];
    contentNode.tags = difference(contentNode.tags, tags);
  });
}
