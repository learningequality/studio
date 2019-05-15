// include all logic in "base" entrypoint
import Vue from 'vue';
import VueRouter from 'vue-router';
import ChannelEditIndex from './ChannelEditIndex.vue';
import ChannelListPage from 'edit_channel/channel_list/views/ChannelListPage.vue';

Vue.use(VueRouter);

const WorkspaceManager = require('../edit_channel/utils/workspace_manager');
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
  ],
});
// var Backbone = require('backbone');

const State = require('edit_channel/state');
// Require the router object so that it is ready for Backbone history start call.
require('../edit_channel/router');

$(function() {
  $('#channel-publish-button').on('click', publish_nodes);
  $('#channel-activate-button').on('click', approve_channel);
  $('#get_published_id').on('click', get_published_id);
  $('#channel_settings').on('click', open_channel_settings);
  if (State.current_channel) {
    State.current_channel.fetch({ async: false });
  }
  $('#channel-edit-content-wrapper').on('click', close_popups);

  new Vue({
    el: '#channel-container',
    store,
    router,
    ...ChannelEditIndex,
  });
});

function open_channel_settings() {
  WorkspaceManager.get_main_view().open_channel_settings();
}

function close_popups() {
  WorkspaceManager.get_main_view().close_all_popups();
}

function publish_nodes() {
  WorkspaceManager.get_main_view().publish();
}

function approve_channel() {
  WorkspaceManager.get_main_view().activate_channel();
}

function get_published_id() {
  WorkspaceManager.get_main_view().get_channel_id();
}
