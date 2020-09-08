export function selectionId(id, ancestorId = null) {
  return ancestorId ? `${id}-${ancestorId}` : id;
}
