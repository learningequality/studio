import { BaseView } from 'edit_channel/views';
import kVueHelper from 'utils/kVueHelper';
import perseusTest from '../perseustest';

// TODO async these? Def async the preview import
import imageTemplate from '../hbtemplates/preview_templates/image.handlebars';
import documentTemplate from '../hbtemplates/preview_templates/document.handlebars';

export default BaseView.extend({
  // model is required, should be a contentModel
  // preview option can be either a file or an assessment_item
  initialize(options) {
    const studioTemplate = this.getStudioTemplate(options.preview, options.intl_data);

    // should probably be 2 different views.
    if(studioTemplate) {
      this.template = studioTemplate;
      this.render = this.renderStudioTemplate;

      this.render();
    } else {
      // no studio template, using kolibri component
      this.vueProps = this.getKolibriProps(this.model, options.preview);
      this.vueComponent = this.getKolibriComponent(this.model, options.preview);
      this.render = this.renderKolibriComponent;

      this.on('destroy', () => {
        if (this.vuePreview) {
          console.log('destroying!');
          // important, particularly here. Destroy clears event listeners
          this.vuePreview.$destroy();
          this.vuePreview = null;
        }
        this.off();
      });

      this.render();
    }
  },
  getStudioTemplate(previewFile, intlData) {
    const imageFormats = ['jpg', 'jpeg', 'png'];

    // only handles file types.
    if(!previewFile || !previewFile.file_format){
      return ''
    }

    // Needs image template (not in kolibri)
    if (imageFormats.includes(previewFile.file_format)) {

      const imageSource = () => {
        if (this.model.has("thumbnail_encoding")) {
          return this.model.get("thumbnail_encoding").base64 || previewFile.storage_url;
        }
        return previewFile.storage_url;
      }

      return imageTemplate({ source: imageSource() }, { data: intlData });
    }

    // Needs subtitle template (not in kolibri)
    if (previewFile.file_format === 'srt') {
      return documentTemplate({ source: previewFile.storage_url }, { data: intlData });
    }

    // only handles _certain_ filetypes
    return '';
  },
  getKolibriProps(contentNodeModel, previewItem){
    const kind = contentNodeModel.get('kind');
    const assessment = kind === 'exercise';
    // renderer handles default preview item
    const itemId = previewItem && previewItem.assessment_id;
    const files = contentNodeModel.get('files').map(file => {
      return Object.assign({
        extension: file.file_format,
        lang: file.language,
        thumbnail: file.preset.thumbnail,
        priority: file.preset.order,
        available: true,
      }, file)
    });

    // decoy. There's a .perseus file present in a kolibri contentNode that's not present here.
    // Needed for render. Expected to be at position 0.
    if(assessment){
      files.splice(0, 0, {
        available: true,
        extension: 'perseus',
      });
    }

    return {
      kind,
      assessment,
      files,
      itemId,
      available: true,
      interactive: false,
    };
  },
  getKolibriComponent(contentNodeModel, previewItem){
    // dupe the global component. Likely to be modified.
    const contentRenderer = Object.assign(
      {}, window.kolibriGlobal.coreVue.components.contentRenderer
    );

    // Modify contentRenderer if assessment
    if(previewItem.assessment_id) {
      // currentViewClass is a `data` property set in the `created` hook via promise
      // the component housed in currentViewClass is rendered via a `v-if`d `<component :is="">`
      // this means that the component and its associated `ref` doesn't exist until:
      // 1) The promise is returned, setting the correct `data` property
      // 2) The DOM updates to reflect the changes in `data`
      Object.assign(contentRenderer, {
        watch: {
          // using a watcher to listen for changes in the data field
          // TODO could manipulate the component here?
          currentViewClass() {
            // giving the component a $nextTick to update the DOM
            // note: binds `this` to the scope of the component
            this.$nextTick(function(){

              // override loadItemData because itemId is necessary, but causes the component to look for
              this.$refs.contentView.loadItemData = () => null;

              // perseus renderer is v-if'd based on itemId. Need DOM to update.
              this.$refs.contentView.$nextTick(function(){
                // files that aren't being served.
                console.log('in component', previewItem.id);
                contentNodeModel.get_perseus_assessment_item(previewItem.id).then(
                  perseusJson => {
                    // copied from perseus renderer index
                    this.item = perseusJson;
                    if (this.$el) {
                      // Don't try to render if our component is not mounted yet.
                      this.renderItem();
                    } else {
                      this.$once('mounted', this.renderItem);
                    }
                  }
                );
              });
            });
          },
        },
      });
    }
    return contentRenderer;
  },
  renderStudioTemplate() {
    this.$el.html(this.template);
    return this;
  },
  renderKolibriComponent() {
    this.vuePreview = kVueHelper(this.vueComponent, {
      propsData: this.vueProps,
      el: this.el,
    });
    return this;
  },
});
