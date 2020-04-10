import chunk from 'lodash/chunk';
import { Tree } from 'shared/data/resources';
import { RELATIVE_TREE_POSITIONS } from 'shared/data/constants';

export function loadChannels(context) {
  const clipboardTreeId = context.rootGetters['clipboardRootId'];
  return context.dispatch('contentNode/loadClipboardTree', null, { root: true }).then(treeNodes => {
    const rootNode = treeNodes.find(node => node.parent === clipboardTreeId);

    if (!rootNode) {
      return [];
    }

    return chunk(
      treeNodes.filter(node => node.parent === rootNode.id).map(node => node.channel_id),
      50
    ).reduce((promise, ids) => {
      return promise.then(all => {
        return context
          .dispatch('channel/loadChannelList', { ids }, { root: true })
          .then(channels => channels.concat(all));
      });
    }, Promise.resolve());
  });
}

export function copy(context, { id, deep = false }) {
  // On the client-side, tree ID's are also the root node ID
  const clipboardTreeId = context.rootGetters['clipboardRootId'];
  return Tree.copy(id, clipboardTreeId, RELATIVE_TREE_POSITIONS.LAST_CHILD, deep);
}

export function copyAll(context, ids) {
  return Promise.all(ids.map(id => context.dispatch('copy', { id })));
}
