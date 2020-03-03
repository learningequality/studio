import VueRouter from 'vue-router';
import { RouterNames } from './constants';
import ChannelTable from './views/ChannelTable';
import ChannelInfo from './views/ChannelInfo';
import UserTable from './views/UserTable';
import UserInfo from './views/UserInfo';

const router = new VueRouter({
  routes: [
    {
      path: '/',
      redirect: '/channels/1',
    },
    {
      path: '/channels',
      redirect: '/channels/1',
    },
    {
      name: RouterNames.CHANNEL_TABLE,
      path: '/channels/:pageNumber',
      props: true,
      component: ChannelTable,
    },
    {
      name: RouterNames.CHANNEL_INFO,
      path: '/channel/:channelId',
      component: ChannelInfo,
    },
    {
      path: '/users',
      redirect: '/users/1',
      alias: '/users/',
    },
    {
      name: RouterNames.USER_TABLE,
      path: '/users/:pageNumber',
      props: true,
      component: UserTable,
    },
    {
      name: RouterNames.USER_INFO,
      path: '/users/:userId',
      component: UserInfo,
    },
  ],
});

export default router;
