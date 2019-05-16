// include all logic in "base" entrypoint
import Vue from 'vue';
import VueRouter from 'vue-router';
import Vuex from 'vuex';
import ChannelEditIndex from './ChannelEditIndex.vue';
import ChannelListPage from 'edit_channel/channel_list/views/ChannelListPage.vue';
import State from 'edit_channel/state';

Vue.use(VueRouter);
Vue.use(Vuex);

const store = require('edit_channel/channel_list/vuex/store');
require('./base');

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
      path: '*', redirect: '/',
    },
  ],
});

$(function() {
  // Bind extra stuff to window object that channel_list will need
  State.setChannelListState();

  new Vue({
    el: '#channel-container',
    store,
    router,
    ...ChannelEditIndex,
  });
});
