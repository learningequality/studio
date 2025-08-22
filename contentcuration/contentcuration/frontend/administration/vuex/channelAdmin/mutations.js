import map from 'lodash/map';

export function SET_PAGE_DATA(
  state,
  {
    next = null,
    previous = null,
    page_number = null,
    count = null,
    total_pages = null,
    results = [],
  } = {},
) {
  state.pageData.next = next;
  state.pageData.previous = previous;
  state.pageData.page_number = page_number;
  state.pageData.count = count;
  state.pageData.total_pages = total_pages;
  state.pageData.results = map(results, r => r.id);
}

export function REMOVE_CHANNEL(state, id) {
  state.pageData.count--;
  state.pageData.results = state.pageData.results.filter(r => r !== id);
}
