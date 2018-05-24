import { Model } from 'backbone';

export default Model.extend({
    defaults: {
      content_model: null,
      file_model: null,
      encoding: '',
      intl_data: null,
    },
  });
