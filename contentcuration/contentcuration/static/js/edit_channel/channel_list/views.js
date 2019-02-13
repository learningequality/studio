
import Vue from 'vue';
var Vuex = require('vuex');
import ChannelListPageComponent from './views/ChannelListPage.vue';

Vue.use(Vuex);

var ChannelListPage = Vue.extend(ChannelListPageComponent);

module.exports = ChannelListPage;
