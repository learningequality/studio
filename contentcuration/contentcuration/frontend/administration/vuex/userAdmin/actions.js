import map from 'lodash/map';
import client from 'shared/client';
import { User } from 'shared/data/resources';

export function loadUser(context, id) {
  return client
    .get(window.Urls.admin_users_detail(id))
    .then(response => {
      response.data.id = response.data.id.toString();
      context.commit('ADD_USERS', [response.data]);
      return response.data;
    })
    .catch(() => {
      return;
    });
}

export function loadUserDetails(context, id) {
  return client.get(window.Urls.admin_users_metadata(id)).then(response => {
    return response.data;
  });
}

export function loadUsers({ commit }, params) {
  const extendedParams = {
    ...params,
    page_size: params.page_size || 100,
  };
  return client.get(window.Urls.admin_users_list(), { params: extendedParams }).then(response => {
    response.data.results = map(response.data.results, u => {
      return { ...u, id: u.id.toString() };
    });
    commit('ADD_USERS', response.data.results);
    commit('SET_PAGE_DATA', response.data);
  });
}

export function updateUser(context, { id, ...data }) {
  return User.updateAsAdmin(id, data).then(response => {
    context.commit('UPDATE_USER', { id, ...data });
    return response.data;
  });
}

export function sendEmail(context, { query, subject, message }) {
  return client.post(window.Urls.send_custom_email(), { query, subject, message });
}

export function deleteUser({ commit }, id) {
  return client.delete(window.Urls.admin_users_detail(id)).then(() => {
    commit('REMOVE_USER', id);
  });
}
