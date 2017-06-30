var Vue = require('vue');
var Backbone = require('backbone');
var BaseViews = require("edit_channel/views");
require("import.less");
var dialog = require("edit_channel/utils/dialog");
var ImportModalComponent = require('./views/ImportModal.vue')
var ImportModal = Vue.extend(ImportModalComponent);
var ImportStore = require('./ImportStore');

var ImportModalView = Backbone.View.extend({
    initialize: function(options) {
        // inject stuff from BaseWorkspaceListView into store
        this.store = new ImportStore({
            onConfirmImport: options.onimport,
            baseViewModel: this.model,
        });
        this.store.$on(
            this.store.eventTypes.START_IMPORT,
            this._importContent.bind(this)
        );
        this.store.$on(
            this.store.eventTypes.SHOW_RELATED_CONTENT_WARNING,
            this._showWarning.bind(this)
        );
        this.listView = new BaseViews.BaseListView();
        this.render();
    },

    render: function() {
        Vue.nextTick().then(this._mountVueComponent.bind(this));
    },

    _mountVueComponent: function() {
        this.ImportModal = new ImportModal({
            propsData: {
                store: this.store,
            }
        });
        this.ImportModal.$mount();
    },

    _showWarning: function(cb) {
        dialog.alert(
            "WARNING",
            "Any associated content will not be imported or referenced as related content.",
            cb
        );
    },

    _importContent: function() {
        var self = this;
        function onFinishImport(resolve) {
            self.store.$once(self.store.eventTypes.FINISH_IMPORT, function() {
                self.ImportModal.closeModal();
                resolve(true);
            });
        }
        this.listView.display_load("Importing Content...", onFinishImport);
    },
});

module.exports = {
    ImportModalView: ImportModalView,
}
