export function selectionId(id, ancestorId = null) {
  return ancestorId ? `${id}-${ancestorId}` : id;
}

export function idFromSelectionId(selectionId) {
  return selectionId.split('-')[0];
}
