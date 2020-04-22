import uniq from 'lodash/uniq';
import * as Vibrant from 'node-vibrant';
import { SelectionFlags } from './constants';
import { Tree, promiseChunk } from 'shared/data/resources';
import { RELATIVE_TREE_POSITIONS } from 'shared/data/constants';

export function loadChannels(context) {
  return context.dispatch('contentNode/loadClipboardTree', null, { root: true }).then(treeNodes => {
    return context.dispatch('loadTreeNodes', treeNodes);
  });
}

export function loadTreeNodes(context, treeNodes) {
  const clipboardTreeId = context.rootGetters['clipboardRootId'];
  const rootNodes = treeNodes.filter(node => node.parent === clipboardTreeId);

  if (!rootNodes.length) {
    return [];
  }

  const root = true;
  const channelIds = uniq(treeNodes.map(node => node.channel_id).filter(Boolean));

  return promiseChunk(channelIds, 50, ids => {
    return context.dispatch('channel/loadChannelList', { ids }, { root });
  })
    .then(channels => {
      return promiseChunk(channelIds, 5, ids => {
        return Promise.all(
          ids.map(id => context.dispatch('contentNode/loadChannelTree', id, { root }))
        );
      }).then(() => channels);
    })
    .then(channels => {
      channels.forEach(channel => {
        if (!(channel.id in context.state.selected)) {
          context.commit('UPDATE_SELECTION_STATE', {
            id: channel.id,
            selectionState: SelectionFlags.NONE,
          });
        }
      });

      // Be sure to put these in after the channels!
      treeNodes.forEach(node => {
        if (!(node.id in context.state.selected)) {
          context.commit('UPDATE_SELECTION_STATE', {
            id: node.id,
            selectionState: SelectionFlags.NONE,
          });
        }
      });

      // Do not return, let this operate async
      context.dispatch('loadChannelColors');
    });
}

const colorChoiceOrder = [
  'Vibrant',
  'LightVibrant',
  'DarkVibrant',
  'LightMuted',
  'Muted',
  'DarkMuted',
];

export function loadChannelColors(context) {
  const channels = context.getters.channels;

  return channels.reduce((promise, channel) => {
    const src = channel.thumbnail_encoding['base64']
      ? channel.thumbnail_encoding['base64']
      : channel.thumbnail_url;

    if (context.getters.getChannelColor(channel.id, null) !== null || !src) {
      return promise;
    }

    const image = new Image();
    image.src = src;

    return promise.then(allColors => {
      return Vibrant.from(image)
        .getPalette()
        .then(palette => {
          let color = '#6c939b';

          if (palette) {
            const colors = colorChoiceOrder.map(name => palette[name].getHex());
            color = colors.find(color => !allColors.includes(color)) || color;
            allColors.push(color);
          }

          context.commit('ADD_CHANNEL_COLOR', { id: channel.id, color });
          return allColors;
        });
    });
  }, Promise.resolve(Object.values(context.state.channelColors)));
}

export function copy(context, { id, target = null, deep = false }) {
  // On the client-side, tree ID's are also the root node ID
  const clipboardTreeId = context.rootGetters['clipboardRootId'];
  target = target || clipboardTreeId;

  return Tree.get(id).then(source => {
    // If the copy source is in the clipboard, "redirect" to real source and try again
    if (source.tree_id === clipboardTreeId) {
      return copy(context, { id: source.source_id, target, deep });
    }

    return Tree.copy(id, target, RELATIVE_TREE_POSITIONS.LAST_CHILD, deep).then(treeNodes => {
      return context.dispatch('loadTreeNodes', treeNodes);
    });
  });
}

export function copyAll(context, ids) {
  return Promise.all(ids.map(id => context.dispatch('copy', { id })));
}

export function setSelectionState(context, { id, selectionState, deep = true, parents = true }) {
  const currentState = context.state.selected[id];

  if (currentState !== selectionState) {
    context.commit('UPDATE_SELECTION_STATE', { id, selectionState });
  } else if (!deep && !parents) {
    return;
  }

  const ALL = SelectionFlags.SELECTED | SelectionFlags.ALL_DESCENDANTS;

  // Update children
  if (deep && (!(selectionState & SelectionFlags.INDETERMINATE) || currentState > ALL)) {
    const clipboardTreeId = context.rootGetters['clipboardRootId'];
    const children =
      id === clipboardTreeId
        ? context.getters.channelIds
        : context.getters.getClipboardChildren(id).map(c => c.id);

    // Update descendants
    children.forEach(id => {
      context.dispatch('setSelectionState', {
        id,
        selectionState: selectionState === ALL ? ALL : SelectionFlags.NONE,
        parents: false,
      });
    });
  }

  // Update ancestors
  const parentId = context.getters.getClipboardParentId(id);

  if (parentId && parents) {
    context.dispatch('setSelectionState', {
      id: parentId,
      selectionState: context.getters.getSelectionState(parentId),
      deep: false,
    });
  }
}

export function resetSelectionState(context) {
  const clipboardTreeId = context.rootGetters['clipboardRootId'];
  return context.dispatch('setSelectionState', {
    id: clipboardTreeId,
    selectionState: SelectionFlags.NONE,
    deep: true,
  });
}
