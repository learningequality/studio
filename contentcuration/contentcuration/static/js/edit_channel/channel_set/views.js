import Vue from 'vue';
import ChannelSetModalComponent from './views/ChannelSetModal.vue';

var Backbone = require('backbone');
var BaseViews = require("../views");
require("import.less"); // eslint-disable-line
var dialog = require("../utils/dialog");
var store = require('./vuex/store');
var vueIntl = require("vue-intl");
var translations = require("utils/translations");
var { PageTypes } = require('./constants');

var ChannelSetModal = Vue.extend(ChannelSetModalComponent);

// Flatten translation dictionary
var unnested_translations = {};
Object.keys(translations).forEach(function (key) {
    Object.keys(translations[key]).forEach(function(nestedKey) {
        unnested_translations[key + "." + nestedKey] = translations[key][nestedKey];
    });
});

Vue.use(vueIntl, {"defaultLocale": "en"});

var currentLanguage = "en";
if (global.languageCode) {
    currentLanguage = global.languageCode;
    Vue.setLocale(currentLanguage);
}

Vue.registerMessages(currentLanguage, unnested_translations);
Vue.prototype.$tr = function $tr(messageId, args) {
    const nameSpace = this.$options.name;
    if (args) {
        if (!Array.isArray(args) && typeof args !== 'object') {
            logging.error(`The $tr functions take either an array of positional
                            arguments or an object of named options.`);
        }
    }
    const defaultMessageText = this.$options.$trs[messageId];
    const message = {
        id: `${nameSpace}.${messageId}`,
        defaultMessage: defaultMessageText,
    };

    return this.$formatMessage(message, args);
};


function getImportStatus(state) {
  return state.import.importStatus;
}

var NAMESPACE = "channel_set";
var MESSAGES = {
    "warning_message": "Any associated content will not be imported or referenced as related content.",
    "importing_content": "Importing Content...",
    "save_and_close": "SAVE & CLOSE",
    "dont_save": "DON'T SAVE",
    "keep_open": "KEEP OPEN"
}

var ChannelSetModalView = BaseViews.BaseView.extend({
    name: NAMESPACE,
    $trs: MESSAGES,
    initialize: function(options) {
        this.options = options;
        // this.statusWatcher = store.watch(
        //   getImportStatus,
        //   this._handleImportStatusChange.bind(this)
        // );
        this.render();
    },

    render: function() {
        Vue.nextTick().then(this._mountVueComponent.bind(this));
    },

    // _handleImportStatusChange: function(status) {
    //   switch (status) {
    //     case 'import_confirmed':
    //       return this._dispatchCopyImportListToChannel();
    //     case 'start':
    //       return this._startImport();
    //     case 'show_warning':
    //       return this._showWarning();
    //     case 'success':
    //       return this._finishImport();
    //     case 'failure':
    //       return this.trigger('finish_import', true);
    //     default:
    //       return;
    //   }
    // },

    // // This is the only call-site for this action, to avoid having to pass BB
    // // variables through component tree. ImportDialogue triggers it by setting
    // // status to 'import_confirmed'
    // _dispatchCopyImportListToChannel: function() {
    //   store.dispatch('import/copyImportListToChannel', {
    //     onConfirmImport: this.options.onimport,
    //     baseViewModel: this.model,
    //   });
    // },

    _mountVueComponent: function() {
        this._resetPageState();
        this.ChannelSetModal = new ChannelSetModal({ store: store });
        this.ChannelSetModal.$on('modalclosed', this._destroy.bind(this));
        this.ChannelSetModal.$on('modalclosing', this._checkChanges.bind(this));
        this.ChannelSetModal.$mount();
    },

    _checkChanges: function(event) {
        if(store.state.channel_set.changed){
          this.cancel_actions(event);
          var self = this;
          dialog.dialog(this.get_translation("unsaved_changes"), this.get_translation("unsaved_changes_text"), {
              [this.get_translation("dont_save")]: function(){
                store.commit('channel_set/SET_CHANGED', false);
                self.ChannelSetModal.closeModal();
              },
              [this.get_translation("keep_open")]:function(){},
              [this.get_translation("save_and_close")]:function(){

              },
          }, null);
        }
    },

    _destroy: function() {
      this._resetPageState();
      // this.statusWatcher();
      // destroy the Vue VM, and remove it from the DOM
      this.ChannelSetModal.$destroy();
      $(this.ChannelSetModal.$el).remove();
    },

    _resetPageState: function() {
        store.commit('channel_set/RESET_PAGE_STATE');
        store.commit('channel_set/SET_IS_NEW', this.options.isNew);
        store.commit('channel_set/SET_CHANNEL_SET', this.model);
    },

    // _saveChannelSet: function() {
    //     this.display_load(this.get_translation("saving"), function(load_resolve, load_reject){
    //         // return this.ChannelSetModal.
    //         // var promises = [];
    //         // for(var i = 0; i < self.lists.length; i++){
    //         //     promises.push(self.lists[i].copy_selected());
    //         //     if(self.lists[i].current_node){
    //         //         break;
    //         //     }
    //         // }
    //         // Promise.all(promises).then(function(lists){
    //         //     var nodeCollection = new Models.ContentNodeCollection();
    //         //     lists.forEach(function(list){
    //         //         nodeCollection.add(list.models);
    //         //     });
    //         //     WorkspaceManager.get_queue_view().clipboard_queue.add_nodes(nodeCollection);
    //         //     load_resolve(true);
    //         // }).catch(function(error){
    //         //     console.log(error);
    //         //     load_reject(error);
    //         // });
    //     });
    // },

    // _finishImport: function() {
    //   this.trigger('finish_import', false);
    // }
});

module.exports = {
    ChannelSetModalView: ChannelSetModalView,
}
