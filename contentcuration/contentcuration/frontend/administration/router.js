import VueRouter from 'vue-router';
import { differenceWith, isEqual, toPairs, fromPairs } from 'lodash';
import { RouterNames, filterTypes, defaultPagination } from './constants';
import ChannelTable from './pages/Channels/ChannelTable';
import UserTable from './pages/Users/UserTable';
import ChannelDetailsModal from 'shared/views/channel/ChannelDetailsModal';

export default new VueRouter({
  routes: [
    {
      name: RouterNames.CHANNELS,
      path: '/channels/',
      // props: route => ({ pagination: paginationFromRoute(route) }),
      component: ChannelTable,
      children: [
        {
          name: RouterNames.CHANNEL,
          path: ':channelId',
          props: true,
          component: ChannelDetailsModal,
        },
      ],
    },
    {
      name: RouterNames.USERS,
      path: '/users/',
      // props: route => ({ pagination: paginationFromRoute(route) }),
      component: UserTable,
    },
    {
      name: RouterNames.USER,
      path: '/user/:id',
      // component: UserInfo,
    },

    // Catch-all redirect to channels tab
    {
      path: '*',
      redirect: { name: RouterNames.CHANNELS },
    },
  ],
});

export function searchUserEditableChannelsLink({ first_name, last_name, email }) {
  return {
    name: RouterNames.CHANNELS,
    query: {
      search: first_name + ' ' + last_name + ' ' + email,
    },
  };
}

export function paginationFromRoute(route) {
  let pagination = defaultPagination(route.name);
  Object.assign(pagination, route.query);
  return pagination;
}

export function backendQueryFromPagination(pagination) {
  let query = Object.assign({}, pagination);
  query.page_size = query.rowsPerPage;
  query.ordering = (query.descending ? '-' : '') + query.sortBy;
  let filterParams = query.filter ? filterTypes[query.filter].backendParams : {};
  Object.assign(query, filterParams);

  delete query.filter;
  delete query.rowsPerPageItems;
  delete query.rowsPerPage;
  delete query.descending;
  delete query.sortBy;

  return query;
}

export function backendQueryFromRoute(route) {
  return backendQueryFromPagination(paginationFromRoute(route));
}

export function queryFromPagination(pagination, routeName) {
  let query = minimizedQuery(pagination, routeName);
  delete query.totalItems;
  delete query.rowsPerPageItems;

  return query;
}

function minimizedQuery(query, routeName) {
  let minimalQueryPairs = differenceWith(
    toPairs(query),
    toPairs(defaultPagination(routeName)),
    isEqual
  );
  return fromPairs(minimalQueryPairs.filter(p => p[1] != null)); // get rid of undefined params
}

export function minimizedQueryForRoute(route) {
  let oldQuery = route.query;
  let newQuery = minimizedQuery(oldQuery, route.name);
  return !isEqual(newQuery, oldQuery) ? newQuery : null;
}

export const queryFromRoute = route => queryFromPagination(paginationFromRoute(route));
