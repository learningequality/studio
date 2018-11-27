import Vue from 'vue';
import ImportModalComponent from './views/YoutubeImportModal.vue';

var Backbone = require('backbone');
var BaseViews = require("../views");
var dialog = require("../utils/dialog");
var store = require('./vuex/store');
var vueIntl = require("vue-intl");
var translations = require("utils/translations");
var { PageTypes, ImportStatus } = require('./constants');

var YoutubeImportModal = Vue.extend(ImportModalComponent);

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
  return state.youtube_import.importStatus;
}

var NAMESPACE = "youtube_import";
var MESSAGES = {
    "importing_content": "Importing Content..."
}

var YoutubeImportModalView = BaseViews.BaseView.extend({
    name: NAMESPACE,
    $trs: MESSAGES,
    initialize: function(options) {
        this.options = options;
        this.statusWatcher = store.watch(
          getImportStatus,
          this._handleImportStatusChange.bind(this)
        );
        this.listView = new BaseViews.BaseListView();
        this.render();
    },

    render: function() {
        Vue.nextTick().then(this._mountVueComponent.bind(this));
    },

    _handleImportStatusChange: function(status) {
      switch (status) {
        case ImportStatus.EXTRACTING:
          return this._startInfoExtract();
        case ImportStatus.UPLOADING:
          return this._startImport();
        // case ImportStatus.DOWNLOADING:
        //   return this.trigger('finish_import', true);
        default:
          return;
      }
    },

    _mountVueComponent: function() {
        this._resetPageState();
        this.YoutubeImportModal = new YoutubeImportModal({ store: store });
        this.YoutubeImportModal.$on('modalclosed', this._destroy.bind(this))
        this.YoutubeImportModal.$mount();
    },

    _destroy: function() {
      this._resetPageState();
      this.statusWatcher();
      // destroy the Vue VM, and remove it from the DOM
      this.YoutubeImportModal.$destroy();
      $(this.YoutubeImportModal.$el).remove();
    },

    _resetPageState: function() {
        store.commit('youtube_import/UPDATE_PAGE_STATE', { pageType: PageTypes.SUBMIT_URL });
        store.commit('youtube_import/RESET_IMPORT_STATE');
    },

    _startInfoExtract: function() {
        // var self = this;
        // function onFinishImport(resolve, reject) {
        //     self.once('finish_import', function(importFailed) {
        //         self.YoutubeImportModal.closeModal();
        //         if (importFailed) {
        //             reject();
        //         } else {
        //           resolve(true);
        //         }
        //     });
        // }
        // this.listView.display_load(this.get_translation("importing_content"), onFinishImport);
    },

    _startImport: function() {
        // var self = this;
        // function onFinishImport(resolve, reject) {
        //     self.once('finish_import', function(importFailed) {
        //         self.YoutubeImportModal.closeModal();
        //         if (importFailed) {
        //             reject();
        //         } else {
        //           resolve(true);
        //         }
        //     });
        // }
        // this.listView.display_load(this.get_translation("importing_content"), onFinishImport);
    },

    _finishImport: function() {
      this.trigger('finish_import', false);
    }
});

module.exports = {
    YoutubeImportModalView: YoutubeImportModalView,
}
