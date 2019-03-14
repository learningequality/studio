import Vue from 'vue';
import ShareModalComponent from './views/ShareModal.vue';
import _ from "underscore";

var Backbone = require('backbone');
var BaseViews = require("../views");
var store = require('./vuex/store');
const State = require("edit_channel/state");

var ShareModal = Vue.extend(ShareModalComponent);

function getChannel(state) {
  let channel = state.share.channel;
  if(channel) {
    return {
      'editors': channel.editors,
      'viewers': channel.viewers,
      'pending_editors': channel.pending_editors
    }
  }
}


var ShareModalView = BaseViews.BaseModalView.extend({
  initialize: function(options) {
    _.bindAll(this, "close")
    this.options = options;
    this.statusWatcher = store.watch(
      getChannel,
      this._syncChannel.bind(this)
    );
    this.render();
  },

  render: function() {
    Vue.nextTick().then(this._mountVueComponent.bind(this));
  },
  _mountVueComponent: function() {
    store.commit('share/RESET');
    let channel = this.model.toJSON();
    // Normalize ids to strings
    channel.editors = _.map(channel.editors, (u) => { return u.id || u; });
    channel.viewers = _.map(channel.viewers, (u) => { return u.id || u; });

    store.commit('share/SET_CHANNEL', channel); // TODO: Pass this into component when pure vue
    this.ShareModal = new ShareModal({ store: store  });
    this.ShareModal.$on('modalclosed', this._destroy.bind(this));
    this.ShareModal.$mount();
  },
  _syncChannel: function(channel) {
    this.model.set(channel);
    this.options.onsync && this.options.onsync();
  },
  _destroy: function() {
    this.close();
    this.statusWatcher();
    store.commit('share/RESET');
    // destroy the Vue VM, and remove it from the DOM
    this.ShareModal.$destroy();
    $(this.ShareModal.$el).remove();
  },
});

module.exports = {
    ShareModalView: ShareModalView,
}
