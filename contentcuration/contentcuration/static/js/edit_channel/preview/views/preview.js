import BaseViews from 'edit_channel/views';

import { bindAll } from 'underscore';

export default BaseViews.BaseView.extend({
    initialize(options) {
        bindAll(this, 'render', 'cleanUpVuePreview');

        // init. Can we just set them to null?
        this.vuePreview = null;

        this.setData(options);
        this.render();
    },
    setData(options) {
        // to bind all of these manually instead of using `model` directly

        // contains parent's model
        this.content_model = this.model.get('content_model');
        this.file_model = this.model.get('file_model');
        this.subtitles = this.model.get('subtitles');
        this.force_load = this.model.get('force_load');
        this.encoding = this.model.get('encoding');
        this.intl_data = this.model.get('intl_data');
    },
    render() {
        // init
        var preview_template;
        var source = this.file_model.storage_url;
        // check file format, define source (if jpeg) and preview template
        // VUE NOT HANDLED HERE
        switch (this.file_model.file_format) {
            case "png":
            case "jpg":
            case "jpeg":
                source = this.encoding || source;
                preview_template = require("../hbtemplates/preview_templates/image.handlebars");
                break;
            case "vtt":
            case "srt":
                preview_template = require("../hbtemplates/preview_templates/document.handlebars");
                break;
            case "pdf":
            case "PDF":
            case "mp3":
            case "mp4":
            case "perseus":
            case "zip":
                break;
            // QUESTION: what does this default template cover?
            default:
                preview_template = require("../hbtemplates/preview_templates/default.handlebars");
        }
        // Was defined above
        if (preview_template) {
            // clear out a vue component if one was present. Are we watching this?
            this.cleanUpVuePreview();
            //  call destroy() on any existing vuePreview (vue component)
            // set vuePreview to null

            // `.handlebars` require returns a function. Specify template vars here.
            this.$el.html(preview_template({
                source: source,
                extension: this.file_model.mimetype,
                checksum: this.file_model.checksum,
                subtitles: this.subtitles
            }, {
                    // QUESTION: what is this second `data` prop?
                    data: this.intl_data
                }));
            if (this.force_load) {
                this.$el.find("video").load();
            }
        // template not defined above, meaning there was no `file_model.file_format` specified. Assume vue
        } else {
            // first use of content_model here. Passed from parent of PreviewModalView.
            // that's probably where vue file's specced
            var kind = this.content_model.get('kind');
            // mock up props here
            var propsData = {
                kind: kind,
                files: [{
                    storage_url: source,
                    extension: this.file_model.file_format,
                    available: true,
                }],
                available: true,
                assessment: kind === 'exercise',
                interactive: false,
                // why are we using `.get` instead of accessing directly?
                // other `*_model`s are probably not Backbone.Models.
                itemId: kind === 'exercise' ? this.content_model.get('assessment_item_ids')[0] : null
            };
            // fresh build of vue component
            if (!this.vuePreview) {
                var ContentRendererComponent = Object.assign(
                    {},
                    // dupe contentRenderer from coreVue. Global var here.
                    // this is a vue component object.
                    window.kolibriGlobal.coreVue.components.contentRenderer
                );
                var Vue = window.kolibriGlobal.lib.vue;

                // QUESTION: why extend?
                var ContentRenderer = Vue.extend(ContentRendererComponent);

                //There's a pseudo-store in global already, if nothing's registered, register this.
                if (!window.kolibriGlobal.coreVue.vuex.store.default.__initialized) {
                    // QUESTION: Do we really need to call registerModule? is it initialized?
                    window.kolibriGlobal.coreVue.vuex.store.default.registerModule();
                }

                // if this works purely with core store, should be fine
                this.vuePreview = new ContentRenderer({
                    propsData: propsData,
                    el: this.el,
                    store: window.kolibriGlobal.coreVue.vuex.store.default,
                });
            } else {
                Object.assign(this.vuePreview, propsData);
            }
        }
        return this;
    },
    cleanUpVuePreview() {
        if (this.vuePreview) {
            this.vuePreview.destroy();
            this.vuePreview = null;
        }
    }
});
