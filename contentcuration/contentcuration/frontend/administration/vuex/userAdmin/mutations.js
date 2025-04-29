import map from 'lodash/map';
import Vue, { set } from 'vue';

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

export function ADD_USERS(state, users = []) {
  users.forEach(user => {
    if (!user.id) {
      throw ReferenceError('id must be defined to update a user');
    }
    UPDATE_USER(state, user);
  });
}

export function UPDATE_USER(state, { id, ...data }) {
  set(state.usersMap, id, Object.assign({}, state.usersMap[id] || {}, { id, ...data }));
}

export function REMOVE_USER(state, id) {
  state.pageData.count--;
  state.pageData.results = state.pageData.results.filter(r => r !== id);
  Vue.delete(state.usersMap, id);
}
