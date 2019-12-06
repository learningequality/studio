import { catalogLastSavedState } from './index';

/* CATALOG MUTATIONS */
export function SET_CATALOG_LIST(state, catalogItems) {
  const catalogMap = {};
  catalogItems.forEach(item => {
    catalogLastSavedState.storeLastSavedState(item);
    catalogMap[item.id] = item;
  });
  state.catalogMap = catalogMap;
}

export function SET_CATALOG_ITEM(state, catalogItem) {
  state.catalogMap = {
    ...state.catalogMap,
    [catalogItem.id]: catalogItem,
  };
}
