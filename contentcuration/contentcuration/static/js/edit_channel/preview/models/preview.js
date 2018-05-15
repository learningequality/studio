import { Model } from 'backbone';

export default Model.extend({
    defaults: {
      file_model: null,
      subtitles: [],
      force_load: false,
      encoding: '',
      intl_data: null,
    },
  });
