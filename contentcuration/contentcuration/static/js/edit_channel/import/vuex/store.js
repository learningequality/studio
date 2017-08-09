var Vue = require('vue');
var Vuex = require('vuex');
var importModule = require('./importModule');

Vue.use(Vuex);

var store = new Vuex.Store({
  modules: {
    import: importModule,
  },
})

module.exports = store;
