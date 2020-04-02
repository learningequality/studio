import VueRouter from 'vue-router';
import { differenceWith, isEqual, toPairs, fromPairs } from 'lodash';
import { RouterNames, defaultPagination } from './constants';
import ChannelTable from './views/ChannelTable';
import ChannelInfo from './views/ChannelInfo';
import UserTable from './views/UserTable';
import UserInfo from './views/UserInfo';

const router = new VueRouter({
  routes: [
    {
      name: RouterNames.CHANNEL_TABLE,
      path: '/channels/',
      props: route => ({ pagination: paginationFromRoute(route) }),
      component: ChannelTable,
    },
    {
      name: RouterNames.CHANNEL_INFO,
      path: '/channel/:channelId',
      component: ChannelInfo,
    },
    {
      name: RouterNames.USER_TABLE,
      path: '/users/:page?',
      props: route => ({ pagination: paginationFromRoute(route) }),
      component: UserTable,
    },
    {
      name: RouterNames.USER_INFO,
      path: '/users/:userId',
      component: UserInfo,
    },
  ],
});

export function paginationFromRoute(route) {
  let pagination = defaultPagination();
  Object.assign(pagination, route.query);
  // console.log("building pagination for route", pagination)
  return pagination;
}

export function queryFromPagination(pagination) {
  let query = fromPairs(differenceWith(toPairs(pagination), toPairs(defaultPagination()), isEqual));
  delete query.totalItems;
  delete query.rowsPerPageItems;
  return query;
}

export const queryFromRoute = route => queryFromPagination(paginationFromRoute(route));

export default router;
