export function mergeMapItem(itemsMap, item, idField = 'id') {
  return {
    ...itemsMap,
    [item[idField]]: {
      ...itemsMap[item[idField]],
      ...item,
    },
  };
}
