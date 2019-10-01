import Vue from 'vue';
import ImportModalComponent from './views/ImportModal.vue';

var BaseViews = require('../views');
require('import.less'); // eslint-disable-line
var dialog = require('../utils/dialog');
var store = require('./vuex/store');
var { PageTypes } = require('./constants');

var ImportModal = Vue.extend(ImportModalComponent);

function getImportStatus(state) {
  return state.import.importStatus;
}

var NAMESPACE = 'import';
var MESSAGES = {
  warning_message: 'Any associated content will not be imported or referenced as related content.',
  importing_content: 'Importing Content...',
};

var ImportModalView = BaseViews.BaseModalView.extend({
  name: NAMESPACE,
  $trs: MESSAGES,
  initialize: function(options) {
    _.bindAll(this, 'close');
    this.options = options;
    this.statusWatcher = store.watch(getImportStatus, this._handleImportStatusChange.bind(this));
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
      case 'failure':
        return this.trigger('finish_import', true);
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
    this.ImportModal.$on('modalclosed', this._destroy.bind(this));
    this.ImportModal.$on('modalclosed', this.close);
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
    store.commit('import/UPDATE_PAGE_STATE', { pageType: PageTypes.TREE_VIEW });
    store.commit('import/RESET_IMPORT_STATE');
  },

  _showWarning: function() {
    dialog.alert(
      this.get_translation('warning'),
      this.get_translation('warning_message'),
      this._dispatchCopyImportListToChannel.bind(this)
    );
  },

  _startImport: function() {
    // now that import is async, we don't want to leave the import selection dialog up
    // while the import is happening. A seperate modal will appear to report task progress.
    this.ImportModal.closeModal();
  },

  _finishImport: function() {
    this.trigger('finish_import', false);
  },
});

module.exports = {
  ImportModalView: ImportModalView,
};
