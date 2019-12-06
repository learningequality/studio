import values from 'lodash/values';

export function itemList(state) {
  return values(state.catalogMap);
}

export function getCatalogItem(state) {
  return function(catalogItemID) {
    return state.catalogMap[catalogItemID];
  };
}
