import VueRouter from 'vue-router';
import { differenceWith, isEqual, toPairs, fromPairs } from 'lodash';
import { RouterNames, filterTypes, defaultPagination } from './constants';
import ChannelTable from './pages/Channels/ChannelTable';
import ChannelInfo from './pages/Channels/ChannelInfo';
import UserTable from './pages/Users/UserTable';
import UserInfo from './pages/Users/UserInfo';

export default new VueRouter({
  routes: [
    {
      path: '/',
      redirect: { name: RouterNames.CHANNELS },
    },
    {
      name: RouterNames.CHANNELS,
      path: '/channels/',
      props: route => ({ pagination: paginationFromRoute(route) }),
      component: ChannelTable,
    },
    {
      name: RouterNames.CHANNEL,
      path: '/channel/:id',
      component: ChannelInfo,
    },
    {
      name: RouterNames.USERS,
      path: '/users/',
      props: route => ({ pagination: paginationFromRoute(route) }),
      component: UserTable,
    },
    {
      name: RouterNames.USER,
      path: '/user/:id',
      component: UserInfo,
    },
  ],
});

export function channelsLink() {
  return { name: RouterNames.CHANNELS };
}

export function usersLink() {
  return { name: RouterNames.USERS };
}

export function channelLink({ id }) {
  return { name: RouterNames.CHANNEL, params: { id } };
}

export function userLink({ id }) {
  return { name: RouterNames.USER, params: { id } };
}

export function searchUserEditableChannelsLink({ first_name, last_name, email }) {
  return {
    name: RouterNames.CHANNELS,
    query: {
      search: first_name + ' ' + last_name + ' ' + email,
    },
  };
}

export function searchChannelEditorsLink({ name, id }) {
  return {
    name: RouterNames.USERS,
    query: {
      search: name + ' ' + id,
    },
  };
}

export function paginationFromRoute(route) {
  let pagination = defaultPagination(route.name);
  Object.assign(pagination, route.query);
  // console.log("building pagination for route", pagination)
  return pagination;
}

export function backendQueryFromPagination(pagination) {
  let query = Object.assign({}, pagination);
  // console.log(filterTypes, query)
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
  // console.log('pagination', pagination);
  let query = minimizedQuery(pagination, routeName);
  delete query.totalItems;
  delete query.rowsPerPageItems;

  return query;
}

function minimizedQuery(query, routeName) {
  // console.log(this);
  let minimalQueryPairs = differenceWith(
    toPairs(query),
    toPairs(defaultPagination(routeName)),
    isEqual
  );
  return fromPairs(minimalQueryPairs.filter(p => p[1] != null)); // get rid of undefined params
}

export function minimizedQueryForRoute(route) {
  // console.log('route', route);
  let oldQuery = route.query;
  let newQuery = minimizedQuery(oldQuery, route.name);
  return !isEqual(newQuery, oldQuery) ? newQuery : null;
}

export const queryFromRoute = route => queryFromPagination(paginationFromRoute(route));

export const routingMixin = {
  computed: {
    syncPagination: {
      get: function() {
        // console.log('getting pagination', this.pagination);
        return this.pagination;
      },
      set: function(pagination) {
        this.$router
          .push({
            query: queryFromPagination(pagination, this.$router.currentRoute.name),
            name: this.$router.currentRoute.name,
          })
          .catch(error => {
            if (error.name != 'NavigationDuplicated') {
              throw error;
            }
          });
      },
    },
  },
  beforeRouteUpdate(to, from, next) {
    this.$store.dispatch('channels/fetch', backendQueryFromRoute(to)).then(() => {
      next();
    });
  },
  created() {
    this.$store.dispatch('channels/fetch', backendQueryFromPagination(this.pagination));
  },
};
