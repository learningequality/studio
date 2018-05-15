import Backbone from 'backbone';

export default Backbone.Model.extend({
    // probably not needed, but mark down what we got.
    // TODO validate?
    defaults: {
      current_preview: null,
      previewView: null,
      format_presets: [],
    },
  });
