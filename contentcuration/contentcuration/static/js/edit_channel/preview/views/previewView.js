import { BaseView } from 'edit_channel/views';

// TODO async these? Def async the preview import
import imageTemplate from '../hbtemplates/preview_templates/image.handlebars';
import documentTemplate from '../hbtemplates/preview_templates/document.handlebars';

export default BaseView.extend({
    initialize(options) {
        this.vuePreview = null;
        this.template = this.getTemplate(options);

        this.on('destroy', () => {
          if(this.vuePreview) {
            this.vuePreview.$destroy();
            this.vuePreview = null;
          }
          this.off();
        });

        this.render();
    },
    getTemplate({ previewFile, intl_data }) {
      const imageFormats = ['jpg','jpeg','png'];

      if (imageFormats.includes(previewFile.file_format)) {

          const imageSource = () => {
            if(this.model.has("thumbnail_encoding")){
               return this.model.get("thumbnail_encoding").base64 || previewFile.storage_url;
            }
            return previewFile.storage_url;
          }

          return imageTemplate({ source: imageSource() }, { data: intl_data });
      }

      if (previewFile.file_format === 'srt') {
          return documentTemplate({ source: previewFile.storage_url }, { data: intl_data });
      }

      // IDEA   VUE WRAPPER - streamline the props assignment process somehow?

      // first use of content_model here. Passed from parent of PreviewModalView.
      // that's probably where vue file's specced
      const kind = this.model.get('kind');
      const assessment = kind === 'exercise';
      const itemId = assessment ? this.model.get('assessment_item_ids')[0] : null;

      // mock up props here
      var propsData = {
          kind,
          assessment,
          itemId,
          files: this.model.get('files').map(file => {
            return Object.assign({
              extension: file.file_format,
              lang: file.language,
              thumbnail: file.preset.thumbnail,
              priority: file.preset.order,
              available: true,
            }, file)
          }),
          available: true,
          interactive: false,
          // why are we using `.get` instead of accessing directly?
          // other `*_model`s are probably not Backbone.Models.
      };

      // TODO VUE WRAPPER - wrap up this process
      var ContentRendererComponent = Object.assign(
          {},
          // dupe contentRenderer from coreVue. Global var here.
          // this is a vue component object.
          window.kolibriGlobal.coreVue.components.contentRenderer
      );
      var Vue = window.kolibriGlobal.lib.vue;

      var ContentRenderer = Vue.extend(ContentRendererComponent);

      // Custom. No need for `Vue.use()` or `new Vuex.Store`
      if (!window.kolibriGlobal.coreVue.vuex.store.default.__initialized) {
          // QUESTION: Do we really need to call registerModule? is it initialized?
          window.kolibriGlobal.coreVue.vuex.store.default.registerModule();
      }
      // importing functional Vue components should be easier, though.
      // if this works purely with core store, should be fine

      // TODO not wrapping any events.
      this.vuePreview = new ContentRenderer({
          propsData: propsData,
          store: window.kolibriGlobal.coreVue.vuex.store.default,

      // starting renders the component. Keep a lookout for issues with responsiveWindow
      }).$mount();

      return this.vuePreview.$el;

    },
    render() {
        this.$el.html(this.template);

        return this;
    },
});
