import VueRouter from 'vue-router';
import { RouteNames } from './constants';
import ChannelTable from './pages/Channels/ChannelTable';
import ChannelDetails from './pages/Channels/ChannelDetails';
import UserTable from './pages/Users/UserTable';
import UserDetails from './pages/Users/UserDetails';

const router = new VueRouter({
  routes: [
    {
      name: RouteNames.CHANNELS,
      path: '/channels/',
      component: ChannelTable,
    },
    {
      name: RouteNames.CHANNEL,
      path: '/channels/:channelId',
      props: true,
      component: ChannelDetails,
    },
    {
      name: RouteNames.USERS,
      path: '/users/',
      component: UserTable,
    },
    {
      name: RouteNames.USER,
      path: '/users/:userId',
      props: true,
      component: UserDetails,
    },
    // Catch-all redirect to channels tab
    {
      path: '*',
      redirect: { name: RouteNames.CHANNELS },
    },
  ],
});

export default router;
