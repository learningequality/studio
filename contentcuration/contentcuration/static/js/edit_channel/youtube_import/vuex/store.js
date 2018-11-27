import Vue from 'vue';
var Vuex = require('vuex');
var youtubeModule = require('./module');

Vue.use(Vuex);

var store = new Vuex.Store({
  modules: {
    'youtube_import': youtubeModule,
  },
})

module.exports = store;
