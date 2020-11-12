import cloneDeep from 'lodash/cloneDeep';
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
    return context.state.draggableContainerDrops[destination.key];
  }

  // We can add grouped handles to this sources array
  const sources = [source].map(cloneDeep);

  const positioning = type => ({
    section: context.rootState.draggable[`${type}s`].hoverDraggableSection,
    relative: context.rootGetters[`draggable/${type}s/draggingTargetSection`],
  });
  const target = {
    identity,
    ...positioning(identity.type),
  };

  // Build drop data for every ancestor, and when those receive drop events, will
  // grab their data from here
  const dropData = destination.ancestorsInOrder.reduce((dropData, ancestor) => {
    const { key } = new DraggableIdentityHelper(ancestor);
    dropData[key] = {
      identity: cloneDeep(ancestor),
      sources,
      target: cloneDeep(target),
      ...positioning(ancestor.type),
    };
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
  context.commit('REMOVE_DRAGGABLE_CONTAINER_DROPS', [key]);
}
