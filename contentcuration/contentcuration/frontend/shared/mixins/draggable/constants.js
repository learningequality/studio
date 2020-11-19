export const DraggableTypes = {
  HANDLE: 'handle',
  CONTAINER: 'container',
  ITEM: 'item',
  COLLECTION: 'collection',
  REGION: 'region',
};

const { ITEM, COLLECTION, REGION, CONTAINER } = DraggableTypes;

export const DraggableContainerTypes = { ITEM, COLLECTION, REGION, CONTAINER };

export const DraggableSearchOrder = [ITEM, COLLECTION, REGION, CONTAINER];

/** @see https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/dropEffect */
export const DropEffect = {
  COPY: 'copy',
  MOVE: 'move',
  NONE: 'none',
};

/** @see https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/effectAllowed */
export const EffectAllowed = {
  COPY: 'copy',
  MOVE: 'move',
  COPY_OR_MOVE: 'copyMove',
  NONE: 'none',
};

/**
 * Not related to `DropEffect` nor `EffectAllowed`, this is unique to Draggable,
 * and used to determine how the containers respond when hovered, and what data is required.
 */
export const DragEffect = {
  DEFAULT: 'default',
  SORT: 'sort',
};
