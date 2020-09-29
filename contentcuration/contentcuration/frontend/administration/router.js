import VueRouter from 'vue-router';
import { RouterNames } from './constants';
import ChannelTable from './pages/Channels/ChannelTable';
import ChannelDetails from './pages/Channels/ChannelDetails';
import UserTable from './pages/Users/UserTable';
import UserDetails from './pages/Users/UserDetails';

const router = new VueRouter({
  routes: [
    {
      name: RouterNames.CHANNELS,
      path: '/channels/',
      component: ChannelTable,
      children: [
        {
          name: RouterNames.CHANNEL,
          path: ':channelId',
          props: true,
          component: ChannelDetails,
        },
      ],
    },
    {
      name: RouterNames.USERS,
      path: '/users/',
      component: UserTable,
      children: [
        {
          name: RouterNames.USER,
          path: ':userId',
          props: true,
          component: UserDetails,
        },
      ],
    },
    // Catch-all redirect to channels tab
    {
      path: '*',
      redirect: { name: RouterNames.CHANNELS },
    },
  ],
});

export default router;
