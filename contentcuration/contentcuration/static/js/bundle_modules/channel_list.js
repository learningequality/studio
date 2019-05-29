// include all logic in "base" entrypoint
import Vue from 'vue';
import VueRouter from 'vue-router';
import Vuex from 'vuex';
import ChannelEditIndex from './ChannelEditIndex.vue';
import State from 'edit_channel/state';

Vue.use(VueRouter);
Vue.use(Vuex);

const store = require('edit_channel/channel_list/vuex/store');
const router = require('edit_channel/channel_list/router');
require('./base');

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
