import BaseViews from 'edit_channel/views';

import PreviewManager from './previewManagerView';

import { bindAll } from 'underscore';

require("modal-styles.less");

export default BaseViews.BaseModalView.extend({
    // seems to be relying on a "Base View", defined in a require statement above.

    // the view only contains shared logic. Template is specified here
    template: require("../hbtemplates/preview_modal.handlebars"),

    // probably loops into some sort of lifecycle
    initialize() {
        // need to bind because this is running in the context of the baseModal view
        bindAll(this, "close_preview");
        this.modal = true; // ?
        // base view contains a render function, takes a "close" argument. Also an object, "node" key?
        // FLAG: special format for data passed into modal?
        this.render(this.close_preview, { node: this.model.toJSON() });

        // QUESTION does the "base" modal view have a custom check for this? Or is this just to bind the data?
        // initialize a new Preview view, defined below. Tell it to populate a specific el
        this.preview_view = new PreviewManager({
            model: this.model,
            el: this.$(".modal-body"),
        });
    },
    close_preview() {
        this.remove();
    },
});
