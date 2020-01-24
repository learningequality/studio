import { ContentNode } from 'shared/data/resources';

export function loadContentNodes(context, params = {}) {
  return ContentNode.where(params).then(contentNodes => {
    context.commit('ADD_CONTENTNODES', contentNodes);
    return contentNodes;
  });
}

export function loadContentNode(context, id) {
  return ContentNode
    .get(id)
    .then(contentNode => {
      context.commit('ADD_CONTENTNODE', contentNode);
      return contentNode;
    })
    .catch(() => {
      return;
    });
}

/* CONTENTNODE EDITOR ACTIONS */
export function createContentNode(context) {
  const session = context.rootState.session;
  const contentNodeData = {
    title: '',
    description: '',
    language: session.preferences ? session.preferences.language : session.currentLanguage,
  };
  return ContentNode.put(contentNodeData).then(id => {
    context.commit('ADD_CONTENTNODE', {
      id,
      ...contentNodeData,
    });
    return id;
  });
}

export function updateContentNode(context, {
    id,
    title = null,
    description = null,
    thumbnailData = null,
    language = null,
    license = null,
    license_description = null,
    copyright_holder = null,
    author = null,
    role_visibility = null,
    aggregator = null,
    provider = null,
    extra_fields = null,
  } = {}) {
  const contentNodeData = {};
  if (!id) {
    throw ReferenceError('id must be defined to update a contentNode');
  }
  if (title !== null) {
    contentNodeData.title = title;
  }
  if (description !== null) {
    contentNodeData.description = description;
  }
  if (
    thumbnailData !== null &&
    ['thumbnail', 'thumbnail_url', 'thumbnail_encoding'].every(attr => thumbnailData[attr])
  ) {
    contentNodeData.thumbnail = thumbnailData.thumbnail;
    contentNodeData.thumbnail_url = thumbnailData.thumbnail_url;
    contentNodeData.thumbnail_encoding = thumbnailData.thumbnail_encoding;
  }
  if (language !== null) {
    contentNodeData.language = language;
  }
  if (license !== null) {
    contentNodeData.license = license;
  }
  if (license_description !== null) {
    contentNodeData.license_description = license_description;
  }
  if (copyright_holder !== null) {
    contentNodeData.copyright_holder = copyright_holder;
  }
  if (author !== null) {
    contentNodeData.author = author;
  }
  if (role_visibility !== null) {
    contentNodeData.role_visibility = role_visibility;
  }
  if (aggregator !== null) {
    contentNodeData.aggregator = aggregator;
  }
  if (provider !== null) {
    contentNodeData.provider = provider;
  }
  if (extra_fields !== null) {
    if (extra_fields.mastery_model !== null) {
      contentNodeData.extra_fields.mastery_model = extra_fields.mastery_model;
    }
    if (extra_fields.m !== null) {
      contentNodeData.extra_fields.m = extra_fields.m;
    }
    if (extra_fields.n !== null) {
      contentNodeData.extra_fields.n = extra_fields.n;
    }
    if (extra_fields.randomize !== null) {
      contentNodeData.extra_fields.randomize = extra_fields.randomize;
    }
  }
  context.commit('UPDATE_CONTENTNODE', { id, ...contentNodeData });
  return ContentNode.update(id, contentNodeData);
}

export function deleteContentNode(context, contentNodeId) {
  return ContentNode.delete(contentNodeId).then(() => {
    context.commit('REMOVE_CONTENTNODE', contentNodeId);
  });
}
