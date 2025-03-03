import draggableModule from './module';

/**
 * -*- Draggable: Drag and Drop -*-
 *
 * The drag and drop functionality has 3 parts:
 *   1. Vuex plugin and module (here)
 *   2. Vue component mixins `shared/mixins/draggable`
 *   3. Vue components `shared/views/draggable`
 *
 * The draggable components are split up into two categories, containers and handles. The two
 * categories align with the native HTML5 drag and drop event handling. Containers handle events
 * associated with a drag entering, hovering, leaving, and dropping on an element. Handles take care
 * of responding to the user dragging it.
 *
 * | Draggable Type | Category    | Purpose                                                 |
 * | -------------- | ----------- | ------------------------------------------------------- |
 * | Region         | Container   | Top level container, defines universe for all draggable |
 * |                |             | components inside                                       |
 * | -------------- | ----------- | ------------------------------------------------------- |
 * | Collection     | Container   | Grouping container, can recurse                         |
 * | -------------- | ----------- | ------------------------------------------------------- |
 * | Item           | Container   | Individual item container                               |
 * | -------------- | ----------- | ------------------------------------------------------- |
 * | Handle         | Handle      | Draggable handle to initiate dragging                   |
 * | -------------- | ----------- | --------------------------------------------------------|
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

  let clientX, clientY;
  let addedDragOverListener = false;
  const dragOverEventListener = function (e) {
    clientX = e.clientX;
    clientY = e.clientY;
  };

  const cancelEventListener = function (e) {
    if ('code' in e) {
      if (e.code !== 'Escape') {
        return;
      }
    } else if (e.which !== 27) {
      return;
    }

    store.dispatch('draggable/handles/resetActiveDraggable');
  };

  // TODO: Accessibility - Add more keyboard handling here for initiating dragging,
  // and moving via arrow keys

  store.subscribeAction(action => {
    // Hook into handle events to provide specific draggable direction globally
    if (action.type === 'draggable/handles/setActiveDraggable') {
      // Sets all draggable types as active, as applicable
      store.dispatch('draggable/setActiveDraggable', action.payload);
      window.addEventListener('keydown', cancelEventListener);
    } else if (action.type === 'draggable/updateDraggableDirection') {
      // Firefox has an issue where it doesn't report the mouse position on drag to the handle
      // side of the API, so we need to hook into dragover to get it
      const { x, y } = action.payload;

      // We'll detect the FF issue when these are null
      if (x === null || y === null) {
        // Add listener so we can track the mouse position. This can't be a `mousemove` as
        // those won't fire while dragging. Ideally, we don't want an actual dragover listener
        if (!addedDragOverListener) {
          document.addEventListener('dragover', dragOverEventListener);
          addedDragOverListener = true;
        }

        // Override action payload
        action.payload.x = clientX;
        action.payload.y = clientY;
      }
    } else if (action.type === 'draggable/handles/resetActiveDraggable') {
      store.dispatch('draggable/resetActiveDraggable', action.payload);
      window.removeEventListener('keydown', cancelEventListener);

      // Be sure to remove the listener if we added it
      if (addedDragOverListener) {
        document.removeEventListener('dragover', dragOverEventListener);
        addedDragOverListener = false;
      }
    }
  });
}

export default DraggablePlugin;
