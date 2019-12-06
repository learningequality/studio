import client from 'shared/client';

/* CHANNEL SET ACTIONS */
export function loadCatalogList(context) {
  return client.get(window.Urls.catalog_list()).then(response => {
    context.commit('SET_CATALOG_LIST', response.data);
  });
}

export function loadCatalogItem(context, id) {
  return client.get(window.Urls.catalog_detail(id)).then(response => {
    context.commit('SET_CATALOG_ITEM', response.data);
    return response.data;
  });
}

export function loadCatalogDetails(context, itemID) {
  return client.get(window.Urls.get_node_details(itemID)).then(response => {
    context.commit('SET_CATALOG_ITEM', response.data);
    return response.data;
  });
}
