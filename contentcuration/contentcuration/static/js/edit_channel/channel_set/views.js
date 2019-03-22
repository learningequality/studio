// TODO: REMOVE BACKBONE

import Vue from 'vue';
import _ from 'underscore';
import ChannelSetModalComponent from './views/ChannelSetModal.vue';

var BaseViews = require('../views');
var dialog = require('../utils/dialog');
var store = require('./vuex/store');

var ChannelSetModal = Vue.extend(ChannelSetModalComponent);

var NAMESPACE = 'channel_set';
var MESSAGES = {
  warning_message: 'Any associated content will not be imported or referenced as related content.',
  importing_content: 'Importing Content...',
  save_and_close: 'SAVE & CLOSE',
  dont_save: "DON'T SAVE",
  keep_open: 'KEEP OPEN',
};

function checkForSave(state) {
  return state.channel_set.saving;
}

export const ChannelSetModalView = BaseViews.BaseModalView.extend({
  name: NAMESPACE,
  $trs: MESSAGES,
  initialize: function(options) {
    _.bindAll(this, 'close');
    this.options = options;
    this.statusWatcher = store.watch(checkForSave, this._handleSaving.bind(this));
    this.render();
  },

  render: function() {
    Vue.nextTick().then(this._mountVueComponent.bind(this));
  },

  _handleSaving: function(saving, close) {
    if (saving) {
      var self = this;
      store.dispatch('channel_set/saveChannelSet', function(model) {
        self.options.onsave(model);
        if (close || store.state.channel_set.closing) {
          store.commit('channel_set/SET_CLOSING', false);
          self.ChannelSetModal.closeModal();
        }
      });
    }
  },

  _mountVueComponent: function() {
    this._resetPageState();
    this.ChannelSetModal = new ChannelSetModal({ store: store });
    this.ChannelSetModal.$on('modalclosed', this._destroy.bind(this));
    this.ChannelSetModal.$on('modalclosed', this.close);
    this.ChannelSetModal.$on('modalclosing', this._checkChanges.bind(this));
    this.ChannelSetModal.$mount();
  },

  _checkChanges: function(event) {
    if (store.state.channel_set.changed) {
      this.cancel_actions(event);
      var self = this;
      dialog.dialog(
        this.get_translation('unsaved_changes'),
        this.get_translation('unsaved_changes_text'),
        {
          [this.get_translation('dont_save')]: function() {
            store.commit('channel_set/SET_CHANGED', false);
            self.ChannelSetModal.closeModal();
          },
          [this.get_translation('keep_open')]: function() {},
          [this.get_translation('save_and_close')]: function() {
            self._handleSaving(true, true);
          },
        },
        null
      );
    }
  },

  _destroy: function() {
    this._resetPageState();
    this.statusWatcher();
    this.ChannelSetModal.$destroy();
    $(this.ChannelSetModal.$el).remove();
  },

  _resetPageState: function() {
    store.commit('channel_set/RESET_PAGE_STATE');
    store.commit('channel_set/SET_IS_NEW', this.options.isNew);
    store.commit('channel_set/SET_CHANNEL_SET', this.model);
  },
});

module.exports = {
  ChannelSetModalView: ChannelSetModalView,
};
