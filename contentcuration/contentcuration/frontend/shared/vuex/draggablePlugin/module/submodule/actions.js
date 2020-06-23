import { DraggableSectionFlags } from 'shared/vuex/draggablePlugin/module/constants';

export function registerDraggableComponent(context, { component }) {
  let lastRelatedTarget = null;

  const ignoreEvent = () => {
    return lastRelatedTarget && lastRelatedTarget.nodeType !== Node.ELEMENT_NODE;
  };

  if (context.state.draggableType !== component.draggableType) {
    throw new Error('Attempted to register a draggable component with different type');
  }

  component.onDraggableDragStart(() => {
    context.dispatch('setActiveDraggable', { component });
  });

  component.onDraggableDragEnd(() => {
    context.dispatch('resetActiveDraggable');
  });

  component.onDraggableDragEnter(e => {
    lastRelatedTarget = e.relatedTarget;

    if (!ignoreEvent()) {
      context.dispatch('setHoverDraggable', { component });
    }
  });

  component.onDraggableDragOver(e => {
    const { clientX, clientY } = e;
    context.dispatch('updateHoverDraggable', { component, clientX, clientY });
  });

  component.onDraggableDragLeave(() => {
    if (!ignoreEvent()) {
      context.dispatch('resetHoverDraggable', { origin: component });
    }

    lastRelatedTarget = null;
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
  if (context.getters.isInActiveDraggableUniverse(component.draggableId)) {
    context.commit('SET_HOVER_DRAGGABLE', component.draggableId);
  }
}

export function updateHoverDraggable(context, { component, clientX, clientY }) {
  if (context.getters.isInActiveDraggableUniverse(component.draggableId)) {
    const { minX, maxX, minY, maxY } = component.getDraggableBounds();
    let section = 0;

    if (clientX >= minX && clientX <= maxX && clientY >= minY && clientY <= maxX) {
      const horizontalMidpoint = (maxX - minX) / 2;
      const verticalMidpoint = (maxY - minY) / 2;

      section ^=
        clientX <= horizontalMidpoint ? DraggableSectionFlags.LEFT : DraggableSectionFlags.RIGHT;

      section ^=
        clientY <= verticalMidpoint ? DraggableSectionFlags.TOP : DraggableSectionFlags.BOTTOM;
    }

    context.commit('SET_HOVER_DRAGGABLE_SECTION', section);
  }
}

export function resetHoverDraggable(context, { origin = null }) {
  // When we have an origin, and it's a different draggable than the currently hovered one
  // we'll just skip and assume an "enter" fired before we reached this via a "leave" event
  if (origin && origin.draggableId !== context.state.hoverDraggableId) {
    return;
  }

  context.commit('RESET_HOVER_DRAGGABLE_SECTION');
  context.commit('RESET_HOVER_DRAGGABLE');
}
