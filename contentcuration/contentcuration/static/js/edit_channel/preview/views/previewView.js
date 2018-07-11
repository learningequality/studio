import { BaseView } from 'edit_channel/views';
import kVueHelper from 'utils/kVueHelper';
import { defer } from 'underscore';

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


      // `this` is bound to vue component. handled by an window event listener
      // needs to be out here to remove event listener
      const pauseVideo = windowClick => {
        if(!this.vuePreview.$el.contains(windowClick.target)) {
          // pause video if not interacting with it
          this.vuePreview.$refs.contentView.setPlayState(false);
          this.vuePreview.$refs.contentView.player.pause();
        }
      }

      this.on('set:vuePreview', function(vuePreview) {
        const contentNodeModel = this.model;
        const assessmentId = options.preview && options.preview.id;

        // to listen for changes in currentViewClass, which is dynamicaly created
        vuePreview.$watch('currentViewClass',
          function tweakIncomingRenderComponent(renderComponent) {
            // only do this tweak if it turns out we're using a perseus exercise
            if (renderComponent.name == 'exercisePerseusRenderer') {
              vuePreview.$nextTick(() =>
                // retrieve the appropriate assessment json from our studio
                contentNodeModel.get_perseus_assessment_item(assessmentId).then(
                  perseusJson => {
                    // do what loadItemData used to do
                    vuePreview.$refs.contentView.item = perseusJson;
                    vuePreview.$refs.contentView.renderItem();
                  }
                )
              );
            }

            if(renderComponent.name === 'videoRender') {
              // allow child to be instantiated
              vuePreview.$nextTick(() => {
                window.addEventListener('click', pauseVideo);
              });
            }
            return renderComponent;
          });

          this.vuePreview = vuePreview;
      });


      this.on('destroy', () => {
        if (this.vuePreview) {
          // important, particularly here. Destroy clears event listeners
          this.vuePreview.$destroy();
          this.vuePreview = null;
        }
        // alternative: do it in an `ondestory` hook for the component that we register for
        window.removeEventListener('click', pauseVideo);
        this.off();
      });

      // vue/react need this to be in DOM before it starts rendering
      defer(() => this.render());
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
          currentViewClass(renderComponent) {
            if (renderComponent.name == 'exercisePerseusRenderer') {
              // overwrite the component's method before it's instantiated.
              // Otherwise, it wipes out the beautiful JSON we already rendered once it returns.
              renderComponent.methods.loadItemData = () => null;
            }
          }
        }
      });
    }
    return contentRenderer;
  },
  renderStudioTemplate() {
    this.$el.html(this.template);
    return this;
  },
  renderKolibriComponent() {
    console.log(this.el);
    this.trigger('set:vuePreview',
      kVueHelper(this.vueComponent, {
        propsData: this.vueProps,
        el: this.el,
      })
    );
    return this;
  },
});
