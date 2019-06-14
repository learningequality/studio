// include all logic in "base" entrypoint
import Vue from 'vue';
import VueRouter from 'vue-router';
import ChannelListPage from 'edit_channel/channel_list/views/ChannelListPage.vue';

Vue.use(VueRouter);

const router = new VueRouter({
  routes: [
    {
      name: 'ChannelList',
      path: '/',
      component: ChannelListPage,
      props: {
        activeList: 'EDITABLE',
      },
    },
    {
      name: 'ChannelList/Starred',
      path: '/starred',
      component: ChannelListPage,
      props: {
        activeList: 'STARRED',
      },
    },
    {
      name: 'ChannelList/ViewOnly',
      path: '/view_only',
      component: ChannelListPage,
      props: {
        activeList: 'VIEW_ONLY',
      },
    },
    {
      name: 'ChannelList/Public',
      path: '/public',
      component: ChannelListPage,
      props: {
        activeList: 'PUBLIC',
      },
    },
    {
      name: 'ChannelList/Collections',
      path: '/collections',
      component: ChannelListPage,
      props: {
        activeList: 'CHANNEL_SETS',
      },
    },
    // Catch-all for unrecognized URLs
    {
      path: '*',
      redirect: '/',
    },
  ],
});

export default router;
module.exports = router;
