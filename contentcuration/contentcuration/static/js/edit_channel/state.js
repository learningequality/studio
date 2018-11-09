const Models = require("./models");
const Constants = require("./constants/index");
const Vuex = require("vuex");
let Vue = require("vue");
const channelModule = require("./vuexModules/channel");

if (Vue.default) {
  // Compatibility for differential behaviour of require import of ES6 export default in webpack vs Jest
  Vue = Vue.default;
}

Vue.use(Vuex);

const Store = new Vuex.Store({
  modules: {
    channel: channelModule,
  },
});

const State = {
  current_channel: window.channel && new Models.ChannelModel(window.channel),
  current_user: new Models.UserModel(window.user),
  nodeCollection: new Models.ContentNodeCollection(),
  currentLanguage: Constants.Languages.find(l => l.id && l.id.toLowerCase() === (window.languageCode || 'en') ),
  openChannel(data) {
    this.staging = data.is_staging || false;
    Store.commit('SET_CONTENT_TAGS', this.current_channel.get('tags'))
    this.preferences = (typeof window.preferences === "string")? JSON.parse(window.preferences) : window.preferences;
    this.current_page = data.page;
  },
  updateUrl(topic, node, title) {
    this.topic = topic || this.topic;
    this.node = node;
    if(title) {
      document.title = title;
    }
  },
  Store,
};

module.exports = State;
