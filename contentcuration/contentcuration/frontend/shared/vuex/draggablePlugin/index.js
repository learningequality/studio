import draggableModule from './module';

/**
 * -*- Drag and Drop -*-
 *
 * The drag and drop functionality has 3 parts:
 *   1. Vuex plugin and module (here)
 *   2. Vue component mixins `shared/mixins/draggable`
 *   3. Vue components `shared/views/draggable`
 *
 * Draggable structure, flat:
 *   Region
 *     > Collection
 *       > Item
 *         > Handle
 *       > Item
 *         > Handle
 *       > Item
 *       ...
 *     > Collection
 *     ...
 *
 * Regions are linked by universe ID:
 *     Region
 *       ⛓
 *    Universe ID
 *       ⛓
 *     Region
 *
 * Draggable structure example:
 * --- Universe -------------------------------------------------------------------------
 * |  --- Region -------------------------     --- Region ----------------------------  |
 * |  |  --- Collection ---------------  |     |  --- Collection ---------------  |  |  |
 * |  |  |  --- Item ---------------  |  |     |  |  --- Item ---------------  |  |  |  |
 * |  |  |  |  | --- Handle --- |  |  |  |     |  |  |  | --- Handle --- |  |  |  |  |  |
 * |  |  |  ------------------------  |  |     |  |  ------------------------  |  |  |  |
 * |  |  |  --- Item ---------------  |  |     |  ------------------------------  |  |  |
 * |  |  |  |  | --- Handle --- |  |  |  |     |  --- Collection ---------------  |  |  |
 * |  |  |  ------------------------  |  |     |  |  --- Item ---------------  |  |  |  |
 * |  |  |  --- Item ---------------  |  |     |  |  |  | --- Handle --- |  |  |  |  |  |
 * |  |  |  |  | --- Handle --- |  |  |  |     |  |  ------------------------  |  |  |  |
 * |  |  |  ------------------------  |  |     |  |  --- Item ---------------  |  |  |  |
 * |  |  ------------------------------  |     |  |  |  | --- Handle --- |  |  |  |  |  |
 * |  |  --- Collection ---------------  |     |  |  ------------------------  |  |  |  |
 * |  |  ------------------------------  |     |  ------------------------------  |  |  |
 * |  ------------------------------------     ---------------------------------------  |
 * --------------------------------------------------------------------------------------
 */
function DraggablePlugin(store) {
  store.registerModule('draggable', draggableModule);

  const cancelEventListener = function(e) {
    if ('code' in e) {
      if (e.code !== 'Escape') {
        return;
      }
    } else if (e.which !== 27) {
      return;
    }

    store.dispatch('draggable/handles/resetActiveDraggable');
  };

  let lastClientX = 0,
    lastClientY = 0;

  store.subscribeAction(action => {
    // Hook into handle events to provide specific draggable direction globally
    if (action.type === 'draggable/handles/registerDraggableComponent') {
      const { component } = action.payload;

      component.onDraggableDragStart(e => {
        const { clientX, clientY } = e;
        lastClientX = clientX;
        lastClientY = clientY;
      });

      component.onDraggableDrag(e => {
        const { clientX, clientY } = e;

        store.dispatch('draggable/updateDraggableDirection', {
          clientX,
          clientY,
          lastClientX,
          lastClientY,
        });

        lastClientX = clientX;
        lastClientY = clientY;
      });

      component.onDraggableDragEnd(() => {
        lastClientX = 0;
        lastClientY = 0;
        store.commit('draggable/RESET_DRAGGABLE_DIRECTION');
      });
    } else if (action.type === 'draggable/handles/setActiveDraggable') {
      store.dispatch('draggable/setActiveDraggable', action.payload);
      window.addEventListener('keydown', cancelEventListener);
    } else if (action.type === 'draggable/handles/resetActiveDraggable') {
      store.dispatch('draggable/resetActiveDraggable', action.payload);
      window.removeEventListener('keydown', cancelEventListener);
    }
  });
}

export default DraggablePlugin;
