import { BaseView } from 'edit_channel/views';
import kVueHelper from 'utils/kVueHelper';
import perseusJSON from '../perseustest.json';

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
    const files = [{
        extension: 'perseus',
        lang: null,
        available: true,
    }];
    const kind = 'exercise';
    const assessment = kind === 'exercise';
    // const itemId = assessment ? this.model.get('assessment_item_ids')[0] : null;

    const item = perseusJSON;

    const propsData = {
      kind,
      item,
      assessment,
      files,
      itemId: null,
      available: true,
      interactive: false,
    };

    const { contentRenderer } = window.kolibriGlobal.coreVue.components;

    contentRenderer.watch = Object.assign({
      currentViewClass() {
        this.$refs.contentView.renderItem();
      },
    }, contentRenderer.watch);

    this.vuePreview = kVueHelper(contentRenderer, propsData);

    return this.vuePreview.$el;

  },
  render() {
    this.$el.html(this.template);

    return this;
  },
});
