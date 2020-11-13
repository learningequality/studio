import cloneDeep from 'lodash/cloneDeep';
import isString from 'lodash/isString';
import { DraggableFlags } from './constants';
import { DraggableIdentityHelper } from './utils';

const rootDispatch = { root: true };

export function setActiveDraggable(context, identity) {
  context.commit('SET_ACTIVE_DRAGGABLE_UNIVERSE', identity.universe);
  const { region, collection, item } = new DraggableIdentityHelper(identity);

  // This gets triggered when picking up a handle, so we'll trigger activation
  // of the ancestor draggable elements
  if (region) {
    context.dispatch('draggable/regions/setActiveDraggable', region, rootDispatch);
  }
  if (collection) {
    context.dispatch('draggable/collections/setActiveDraggable', collection, rootDispatch);
  }
  if (item) {
    context.dispatch('draggable/items/setActiveDraggable', item, rootDispatch);
  }
}

export function resetActiveDraggable(context) {
  context.commit('RESET_ACTIVE_DRAGGABLE_UNIVERSE');

  context.dispatch('draggable/regions/resetActiveDraggable', {}, rootDispatch);
  context.dispatch('draggable/collections/resetActiveDraggable', {}, rootDispatch);
  context.dispatch('draggable/items/resetActiveDraggable', {}, rootDispatch);
}

/**
 * @param context
 * @param {DraggableIdentity} identity
 */
export function addGroupedDraggableHandle(context, identity) {
  if (!context.getters.isGroupedDraggableHandle(identity)) {
    context.commit('ADD_GROUPED_HANDLE', identity);
  }
}

/**
 * @param context
 * @param {DraggableIdentity} identity
 */
export function removeGroupedDraggableHandle(context, identity) {
  if (context.getters.isGroupedDraggableHandle(identity)) {
    context.commit('REMOVE_GROUPED_HANDLE', identity);
  }
}

/**
 * Determines the direction of mouse motion, which should only change when
 * the user actually changes mouse direction
 */
export function updateDraggableDirection(context, { x, y }) {
  const { clientX, clientY } = context.state;

  if (clientX !== x || clientY !== y) {
    context.commit('UPDATE_MOUSE_POSITION', { x, y });
  }

  if (clientX === null || clientY === null) {
    return;
  }

  const xDiff = x - clientX;
  const yDiff = y - clientY;
  let dir = context.state.draggableDirection;

  if (xDiff > 0) {
    dir |= DraggableFlags.RIGHT;
    dir ^= dir & DraggableFlags.LEFT;
  } else if (xDiff < 0) {
    dir |= DraggableFlags.LEFT;
    dir ^= dir & DraggableFlags.RIGHT;
  }

  if (yDiff > 0) {
    dir |= DraggableFlags.DOWN;
    dir ^= dir & DraggableFlags.UP;
  } else if (yDiff < 0) {
    dir |= DraggableFlags.UP;
    dir ^= dir & DraggableFlags.DOWN;
  }

  // If direction would be none, just ignore it. When dragging stops, it should
  // be reset anyway
  if (dir > DraggableFlags.NONE) {
    context.commit('UPDATE_DRAGGABLE_DIRECTION', dir);
  }
}

export function resetDraggableDirection(context) {
  context.commit('RESET_DRAGGABLE_DIRECTION');
  context.commit('UPDATE_MOUSE_POSITION', { x: null, y: null });
}

/**
 *
 * @param context
 * @param identity
 * @return {{
 *  sources: DraggableIdentity[],
 *  identity: DraggableIdentity,
 *  section: Number,
 *  relative: Number,
 *  target: {
 *    identity: DraggableIdentity,
 *    section: Number,
 *    relative: Number
 *  }}|null}
 */
export function setDraggableDropped(context, identity) {
  // In the future, we could add handles to other types like collections and regions,
  // which this would support
  const source = context.getters.deepestActiveDraggable;
  const destination = new DraggableIdentityHelper(identity);

  // Can't drop on ourselves
  if (!source || destination.is(source)) {
    return null;
  }

  if (destination.key in context.state.draggableContainerDrops) {
    // Ancestors will map to the string of the actual data, instead of duplicating,
    // as prepared in code below
    const key = isString(context.state.draggableContainerDrops[destination.key])
      ? context.state.draggableContainerDrops[destination.key]
      : destination.key;

    return context.state.draggableContainerDrops[key];
  }

  // We can add grouped handles to this sources array
  const sources = [source].map(cloneDeep);
  const { hoverDraggableSection, hoverDraggableTarget } = context.rootState.draggable[
    `${identity.type}s`
  ];
  const target = {
    identity,
    section: hoverDraggableSection,
    relative: hoverDraggableTarget,
  };

  // Build drop data for every ancestor, and when those receive drop events, will
  // grab their data from here
  const dropData = identity.ancestors.reduce((dropData, ancestor) => {
    const { key } = new DraggableIdentityHelper(ancestor);
    dropData[key] = destination.key;
    return dropData;
  }, {});

  // Construct the data we'll return, and expand `target` as that matches ancestor structure
  const selfData = (dropData[destination.key] = {
    ...target,
    target,
    sources,
  });
  context.commit('ADD_DRAGGABLE_CONTAINER_DROPS', dropData);
  return selfData;
}

export function clearDraggableDropped(context, identity) {
  const { key } = new DraggableIdentityHelper(identity);

  // If this identity maps to another key, use that
  let targetKey = isString(context.state.draggableContainerDrops[key])
    ? context.state.draggableContainerDrops[key]
    : key;

  const keys = Object.entries(context.state.draggableContainerDrops)
    .filter(([otherKey, mappedKey]) => mappedKey === targetKey || otherKey === targetKey)
    .map(([otherKey]) => otherKey);
  context.commit('REMOVE_DRAGGABLE_CONTAINER_DROPS', keys);
}
