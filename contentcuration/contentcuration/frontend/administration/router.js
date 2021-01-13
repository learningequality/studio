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
    },
    {
      name: RouterNames.CHANNEL,
      path: '/channels/:channelId',
      props: true,
      component: ChannelDetails,
    },
    {
      name: RouterNames.USERS,
      path: '/users/',
      component: UserTable,
    },
    {
      name: RouterNames.USER,
      path: '/users/:userId',
      props: true,
      component: UserDetails,
    },
    // Catch-all redirect to channels tab
    {
      path: '*',
      redirect: { name: RouterNames.CHANNELS },
    },
  ],
});

export default router;
