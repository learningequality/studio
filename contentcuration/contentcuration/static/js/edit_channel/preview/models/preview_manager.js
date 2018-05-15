import { Model } from 'backbone';

export default Model.extend({
    // probably not needed, but mark down what we got.
    // TODO validate?
    defaults: {
      content_model: null,
      current_preview: null,
      previewView: null,
      format_presets: [],
    },
  });
