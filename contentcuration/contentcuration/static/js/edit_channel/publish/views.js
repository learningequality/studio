import Vue from 'vue';
import PublishModalComponent from './views/PublishModal.vue';
import PublishingOverlayComponent from './views/PublishingOverlay.vue';
import _ from "underscore";

var Backbone = require('backbone');
var BaseViews = require("../views");
var store = require('./vuex/store');
const State = require("edit_channel/state");

var PublishModal = Vue.extend(PublishModalComponent);
var PublishingOverlay = Vue.extend(PublishingOverlayComponent);

// function getChannel(state) {
//   let channel = state.share.channel;
//   if(channel) {
//     return {
//       'editors': channel.editors,
//       'viewers': channel.viewers,
//       'pending_editors': channel.pending_editors
//     }
//   }
// }


var PublishModalView = BaseViews.BaseModalView.extend({
  initialize: function(options) {
    _.bindAll(this, "close")
    this.options = options;
    // this.statusWatcher = store.watch(
    //   getChannel,
    //   this._syncChannel.bind(this)
    // );
    this.render();
  },

  render: function() {
    Vue.nextTick().then(this._mountVueComponent.bind(this));
  },
  _mountVueComponent: function() {
    store.commit('publish/RESET');
    let channel = this.model.toJSON();

    store.commit('publish/SET_CHANNEL', channel);
    this.PublishModal = new PublishModal({ store: store  });
    this.PublishModal.$on('modalclosed', this._destroy.bind(this));
    this.PublishModal.$mount();
  },
  _syncChannel: function(channel) {
    this.model.set(channel);
    this.options.onsync && this.options.onsync();
  },
  _destroy: function() {
    this.close();
    // this.statusWatcher();
    store.commit('publish/RESET');
    // destroy the Vue VM, and remove it from the DOM
    this.PublishModal.$destroy();
    $(this.PublishModal.$el).remove();
  },
});

module.exports = {
    PublishModalView: PublishModalView
}
