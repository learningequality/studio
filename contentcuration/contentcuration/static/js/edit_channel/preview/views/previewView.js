import { BaseView } from 'edit_channel/views';
import kVueHelper from 'utils/kVueHelper';
import perseusTest from '../perseustest';

// TODO async these? Def async the preview import
import imageTemplate from '../hbtemplates/preview_templates/image.handlebars';
import documentTemplate from '../hbtemplates/preview_templates/document.handlebars';

export default BaseView.extend({
  initialize(options) {
    // initialized as a side effect of getTemplate if needed.
    this.vuePreview = null;
    this.template = this.getTemplate(options);

    this.on('destroy', () => {
      if (this.vuePreview) {
        // important, particularly here. Destroy clears event listeners
        this.vuePreview.$destroy();
        this.vuePreview = null;
      }
      this.off();
    });

    this.render();
  },
  getTemplate({ previewFile, intl_data }) {
    const imageFormats = ['jpg', 'jpeg', 'png'];

    // Needs image template (not in kolibri)
    if (imageFormats.includes(previewFile.file_format)) {

      const imageSource = () => {
        if (this.model.has("thumbnail_encoding")) {
          return this.model.get("thumbnail_encoding").base64 || previewFile.storage_url;
        }
        return previewFile.storage_url;
      }

      return imageTemplate({ source: imageSource() }, { data: intl_data });
    }

    // Needs subtitle template (not in kolibri)
    if (previewFile.file_format === 'srt') {
      return documentTemplate({ source: previewFile.storage_url }, { data: intl_data });
    }

    // Kolibri renderable

    // mock up vue props here
    // const kind = this.model.get('kind');
    // const assessment = kind === 'exercise';
    // // const itemId = assessment ? this.model.get('assessment_item_ids')[0] : null;
    // const files = this.model.get('files').map(file => {
    //   return Object.assign({
    //     extension: file.file_format,
    //     lang: file.language,
    //     thumbnail: file.preset.thumbnail,
    //     priority: file.preset.order,
    //     available: true,
    //   }, file)
    // });
    // const kind = 'exercise';
    // const assessment = kind === 'exercise';
    // const itemId = assessment ? this.model.get('assessment_item_ids')[0] : null;


    // const propsData = {
    //   kind,
    //   item,
    //   assessment,
    //   files,
    //   itemId: null,
    //   available: true,
    //   interactive: false,
    // };

    console.log('test dummy', perseusTest);

    const propsData = perseusTest;

    const { contentRenderer } = window.kolibriGlobal.coreVue.components;

    // currentViewClass is a `data` property set in the `created` hook via promise
    // the component housed in currentViewClass is rendered via a `v-if`d `<component :is="">`
    // this means that the component and its associated `ref` doesn't exist until:
    // 1) The promise is returned, setting the correct `data` property
    // 2) The DOM updates to reflect the changes in `data`
    Object.assign(contentRenderer, {
      watch: {
        // using a watcher to listen for changes in the data field
        currentViewClass() {
          // giving the component a $nextTick to update the DOM
          // note: binds `this` to the scope of the component
          this.$nextTick(function(){

            // override loadItemData because itemId is necessary, but causes the component to look for
            this.$refs.contentView.loadItemData = () => null;

            // perseus renderer is v-if'd based on itemId. Need DOM to update.
            this.$refs.contentView.$nextTick(function(){
              // files that aren't being served.
              console.log('entering the if...');

              const item = JSON.parse(propsData.perseusObject.itemData)

              // copied from perseus renderer index
              if (this.validateItemData(item)) {
                console.log('if passed!!');
                this.item = item;
                if (this.$el) {
                  // Don't try to render if our component is not mounted yet.
                  this.renderItem();
                } else {
                  this.$once('mounted', this.renderItem);
                }
              } else {
                console.error('Loaded item was malformed', item);
              }
            });
          });
        },
      },
    });

    this.vuePreview = kVueHelper(contentRenderer, propsData);

    return this.vuePreview.$el;

  },
  render() {
    this.$el.html(this.template);

    return this;
  },
});
