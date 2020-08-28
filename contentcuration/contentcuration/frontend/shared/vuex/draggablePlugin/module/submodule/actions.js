import { DraggableSectionFlags } from 'shared/vuex/draggablePlugin/module/constants';
import { animationThrottle } from 'shared/utils';

export function registerDraggableComponent(context, { component }) {
  if (context.state.draggableType !== component.draggableType) {
    throw new Error('Attempted to register a draggable component with different type');
  }

  component.onDraggableDragStart(() => {
    context.dispatch('setActiveDraggable', { component });
  });

  component.onDraggableDragEnd(() => {
    context.dispatch('resetActiveDraggable');
  });

  component.onDraggableDragEnter(() => {
    context.dispatch('setHoverDraggable', { component });
  });

  component.onDraggableDragOver(e => {
    const { clientX, clientY } = e;
    context.dispatch('updateHoverDraggable', { component, clientX, clientY });
  });

  component.onDraggableDragLeave(() => {
    context.dispatch('resetHoverDraggable', { origin: component });
  });

  context.commit('ADD_COMPONENT', component);
}

export function unregisterDraggableComponent(context, { component }) {
  if (context.state.draggableType !== component.draggableType) {
    throw new Error('Attempted to unregister a draggable component with different type');
  }

  context.commit('REMOVE_COMPONENT', component);
}

export function setActiveDraggable(context, { component }) {
  context.commit('SET_ACTIVE_DRAGGABLE', component.draggableId);
}

export function resetActiveDraggable(context) {
  context.commit('RESET_ACTIVE_DRAGGABLE');
}

export function setHoverDraggable(context, { component }) {
  const { draggableId } = component;

  // Make sure we've not trying set the same draggable
  if (
    context.state.hoverDraggableId !== draggableId &&
    context.state.activeDraggableId !== draggableId &&
    context.getters.isInActiveDraggableUniverse(draggableId)
  ) {
    context.commit('SET_LAST_HOVER_DRAGGABLE', context.state.hoverDraggableId);
    context.commit('SET_HOVER_DRAGGABLE', draggableId);
  }
}

/**
 * Wrap this action in an animation throttle so draggable elements of this type should
 * update in the same animation frame
 */
export const updateHoverDraggable = animationThrottle(function(
  context,
  { component, clientX, clientY }
) {
  if (context.getters.isInActiveDraggableUniverse(component.draggableId)) {
    const { minX, maxX, minY, maxY } = component.getDraggableBounds();
    let section = 0;

    if (clientX >= minX && clientX <= maxX && clientY >= minY && clientY <= maxY) {
      const horizontalMidpoint = (maxX - minX) / 2 + minX;
      const verticalMidpoint = (maxY - minY) / 2 + minY;

      section ^=
        clientX <= horizontalMidpoint ? DraggableSectionFlags.LEFT : DraggableSectionFlags.RIGHT;

      section ^=
        clientY <= verticalMidpoint ? DraggableSectionFlags.TOP : DraggableSectionFlags.BOTTOM;
    }

    context.commit('SET_LAST_HOVER_DRAGGABLE_SECTION', context.state.hoverDraggableSection);
    context.commit('SET_HOVER_DRAGGABLE_SECTION', section);
    context.dispatch('setHoverDraggable', { component });
  } else {
    context.dispatch('resetHoverDraggable');
  }
});

export function resetHoverDraggable(context, { origin = null }) {
  // When we have an origin, and it's a different draggable than the currently hovered one
  // we'll just skip and assume an "enter" fired before we reached this via a "leave" event
  if (origin && origin.draggableId !== context.state.hoverDraggableId) {
    return;
  }

  context.commit('RESET_HOVER_DRAGGABLE_SECTION');
  context.commit('RESET_LAST_HOVER_DRAGGABLE_SECTION');
  context.commit('RESET_HOVER_DRAGGABLE');
  context.commit('RESET_LAST_HOVER_DRAGGABLE');
}
