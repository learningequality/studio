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
