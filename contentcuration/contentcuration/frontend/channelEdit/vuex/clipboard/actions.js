import uniq from 'lodash/uniq';
import * as Vibrant from 'node-vibrant';
import { SelectionFlags } from './constants';
import { Tree } from 'shared/data/resources';
import { promiseChunk } from 'shared/utils';
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

  // Find the channels we need to load
  const channelIds = uniq(treeNodes.map(node => node.channel_id).filter(Boolean));
  return promiseChunk(channelIds, 50, id__in => {
    // Load up the source channels
    return context.dispatch('channel/loadChannelList', { id__in }, { root });
  })
    .then(channels => {
      // We need the channel tree for each source, which we need for copying,
      // although we could probably delay this.
      //
      return promiseChunk(channelIds, 5, ids => {
        return Promise.all(
          ids.map(id => context.dispatch('contentNode/loadChannelTree', id, { root }))
        );
      }).then(() => channels);
    })
    .then(channels => {
      // Add the channel to the selected state, it acts like a node
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

      // Do not return dispatch, let this operate async
      context.dispatch('loadChannelColors');
      return treeNodes;
    });
}

// Here are the swatches Vibrant gives, and the order we'll check them for colors we can use.
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

  // Reducing the channels, going one by one processing colors, and collection an array
  // of all of them
  return channels.reduce((promise, channel) => {
    const src = channel.thumbnail_encoding['base64']
      ? channel.thumbnail_encoding['base64']
      : channel.thumbnail_url;

    // If we already have the color, just no src, then we'll just skip
    if (context.getters.getChannelColor(channel.id, null) !== null || !src) {
      return promise;
    }

    const image = new Image();
    image.src = src;

    //
    return promise.then(allColors => {
      return Vibrant.from(image)
        .getPalette()
        .then(palette => {
          let color = null;

          if (palette) {
            const colors = colorChoiceOrder.map(name => palette[name].getHex());
            // Find the first color that we don't already have
            color = colors.find(color => !allColors.includes(color)) || color;
            allColors.push(color);
          }

          // Add it now so the user can see it
          context.commit('ADD_CHANNEL_COLOR', { id: channel.id, color });
          return allColors;
        });
    });
  }, Promise.resolve(Object.values(context.state.channelColors)));
}

/**
 * @param context
 * @param {string} id
 * @param {string|null} [target]
 * @param {boolean} [deep]
 * @param children
 * @return {*}
 */
export function copy(context, { id, target = null, deep = false, children = [] }) {
  if (deep && children.length) {
    throw new Error('Both children and deep flag cannot be set');
  }

  // On the client-side, tree ID's are also the root node ID
  const clipboardTreeId = context.rootGetters['clipboardRootId'];
  target = target || clipboardTreeId;

  return Tree.get(id).then(source => {
    // If the copy source is in the clipboard, "redirect" to real source and try again
    if (source.tree_id === clipboardTreeId) {
      return context.dispatch('copy', { id: source.source_id, target, deep, children });
    }

    // This copies a "bare" copy, if you want a full content node copy,
    // go to the contentNode state actions
    return Tree.copy(id, target, RELATIVE_TREE_POSITIONS.LAST_CHILD, deep)
      .then(treeNodes => {
        return context.dispatch('loadTreeNodes', treeNodes);
      })
      .then(treeNodes => {
        if (!children.length) {
          return treeNodes;
        }

        // If we have children to add, then copy only returned one node
        const [parentNode] = treeNodes;
        return promiseChunk(children, 1, ([child]) => {
          return context.dispatch(
            'copy',
            Object.assign(child, {
              target: parentNode.id,
            })
          );
        }).then(otherTreeNodes => {
          // Add parent to beginning
          otherTreeNodes.unshift(parentNode);
          return otherTreeNodes;
        });
      });
  });
}

export function copyAll(context, { id__in, deep = false }) {
  const clipboardNode = context.rootGetters['contentNode/getContentNode'](
    window.user.clipboard_root_id
  );
  const copyPromise = promiseChunk(id__in, 20, idChunk => {
    return Promise.all(idChunk.map(id => context.dispatch('copy', { id, deep })));
  });

  // We need to check if the clipboard tree is initialized before we try to copy.
  if (!clipboardNode) {
    return context
      .dispatch('contentNode/loadClipboardTree', null, { root: true })
      .then(() => copyPromise);
  } else {
    return copyPromise;
  }
}

/**
 * Recursive function to set selection state for a node, and possibly it's ancestors and descendants
 */
export function setSelectionState(context, { id, selectionState, deep = true, parents = true }) {
  const currentState = context.state.selected[id];

  // Well, we should only bother if it needs updating
  if (currentState !== selectionState) {
    context.commit('UPDATE_SELECTION_STATE', { id, selectionState });
  } else if (!deep && !parents) {
    return;
  }

  // Union for the ALL state (5)
  const ALL = SelectionFlags.SELECTED | SelectionFlags.ALL_DESCENDANTS;

  // Does this change cascade to the children? If so, and we're going `deep` then
  // cascade down what should happen
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

  const parentId = context.getters.getClipboardParentId(id);

  if (parentId && parents) {
    // Updating the parents at this point is fairly easy, we just recurse upwards, recomputing
    // the new state for the parent
    context.dispatch('setSelectionState', {
      id: parentId,
      selectionState: context.getters.getSelectionState(parentId),
      deep: false,
    });
  }
}

/**
 * Global deselect all!
 */
export function resetSelectionState(context) {
  const clipboardTreeId = context.rootGetters['clipboardRootId'];
  return context.dispatch('setSelectionState', {
    id: clipboardTreeId,
    selectionState: SelectionFlags.NONE,
    deep: true,
  });
}
