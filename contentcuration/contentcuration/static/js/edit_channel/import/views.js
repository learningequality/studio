var Vue = require('vue');
var Backbone = require('backbone');
var BaseViews = require("../views");
require("import.less"); // eslint-disable-line
var dialog = require("../utils/dialog");
var ImportModalComponent = require('./views/ImportModal.vue')
var ImportModal = Vue.extend(ImportModalComponent);
var store = require('./vuex/store');

function getImportStatus(state) {
  return state.import.importStatus;
}

var ImportModalView = Backbone.View.extend({
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
        case 'import_confirmed':
          return this._dispatchCopyImportListToChannel();
        case 'start':
          return this._startImport();
        case 'show_warning':
          return this._showWarning();
        case 'success':
          return this._finishImport();
        default:
          return;
      }
    },

    // This is the only call-site for this action, to avoid having to pass BB
    // variables through component tree. ImportDialogue triggers it by setting
    // status to 'import_confirmed'
    _dispatchCopyImportListToChannel: function() {
      store.dispatch('import/copyImportListToChannel', {
        onConfirmImport: this.options.onimport,
        baseViewModel: this.model,
      });
    },

    _mountVueComponent: function() {
        this._resetPageState();
        this.ImportModal = new ImportModal({ store: store });
        this.ImportModal.$on('modalclosed', this._destroy.bind(this))
        this.ImportModal.$mount();
    },

    _destroy: function() {
      this._resetPageState();
      this.statusWatcher();
      // destroy the Vue VM, and remove it from the DOM
      this.ImportModal.$destroy();
      $(this.ImportModal.$el).remove();
    },

    _resetPageState: function() {
        store.commit('import/UPDATE_PAGE_STATE', { pageType: 'tree_view' });
        store.commit('import/RESET_IMPORT_STATE');
    },

    _showWarning: function() {
        dialog.alert(
            "WARNING",
            "Any associated content will not be imported or referenced as related content.",
            this._dispatchCopyImportListToChannel.bind(this)
        );
    },

    _startImport: function() {
        var self = this;
        function onFinishImport(resolve) {
            self.once('finish_import', function() {
                self.ImportModal.closeModal();
                resolve(true);
            });
        }
        this.listView.display_load("Importing Content...", onFinishImport);
    },

    _finishImport: function() {
      this.trigger('finish_import');
    }
});

module.exports = {
    ImportModalView: ImportModalView,
}
