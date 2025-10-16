import isEqual from 'lodash/isEqual';
import transform from 'lodash/transform';
import uniq from 'lodash/uniq';
import { mapGetters } from 'vuex';
import {
  ChannelListTypes,
  fileErrors,
  ONE_B,
  ONE_KB,
  ONE_MB,
  ONE_GB,
  ONE_TB,
  filterTypes,
} from './constants';
import { translateMetadataString } from './utils/metadataStringsTranslation';
import { createTranslator, updateTabTitle } from 'shared/i18n';
import Languages from 'shared/leUtils/Languages';
import Licenses from 'shared/leUtils/Licenses';

const sizeStrings = createTranslator('BytesForHumansStrings', {
  fileSizeInBytes: '{n, number, integer} B',
  fileSizeInKilobytes: '{n, number, integer} KB',
  fileSizeInMegabytes: '{n, number, integer} MB',
  fileSizeInGigabytes: '{n, number, integer} GB',
  fileSizeInTerabytes: '{n, number, integer} TB',
});

const stringMap = {
  [ONE_B]: 'fileSizeInBytes',
  [ONE_KB]: 'fileSizeInKilobytes',
  [ONE_MB]: 'fileSizeInMegabytes',
  [ONE_GB]: 'fileSizeInGigabytes',
  [ONE_TB]: 'fileSizeInTerabytes',
};

export default function bytesForHumans(bytes) {
  bytes = bytes || 0;
  const unit = [ONE_TB, ONE_GB, ONE_MB, ONE_KB].find(x => bytes >= x) || ONE_B;
  return sizeStrings.$tr(stringMap[unit], { n: Math.round(bytes / unit) });
}

export const fileSizeMixin = {
  methods: {
    formatFileSize(size) {
      return bytesForHumans(size);
    },
  },
};

const statusStrings = createTranslator('StatusStrings', {
  uploadFileSize: '{uploaded} of {total}',
  uploadFailedError: 'Upload failed',
  noStorageError: 'Not enough space',
});

export const fileStatusMixin = {
  mixins: [fileSizeMixin],
  computed: {
    ...mapGetters('file', ['getFileUpload']),
  },
  methods: {
    statusMessage(id) {
      const errorMessage = this.errorMessage(id);
      if (errorMessage) {
        return errorMessage;
      }
      const file = this.getFileUpload(id);
      if (file && file.total) {
        return statusStrings.$tr('uploadFileSize', {
          uploaded: bytesForHumans(file.loaded),
          total: bytesForHumans(file.total),
        });
      }
    },
    errorMessage(id) {
      const file = this.getFileUpload(id);
      if (!file) {
        return;
      }
      if (file.error === fileErrors.NO_STORAGE) {
        return statusStrings.$tr('noStorageError');
      } else if (file.error === fileErrors.UPLOAD_FAILED) {
        return statusStrings.$tr('uploadFailedError');
      }
    },
  },
};

export const constantStrings = createTranslator('ConstantStrings', {
  [ChannelListTypes.EDITABLE]: 'My channels',
  [ChannelListTypes.VIEW_ONLY]: 'View-only',
  [ChannelListTypes.PUBLIC]: 'Content library',
  [ChannelListTypes.STARRED]: 'Starred',
  do_all: 'Goal: 100% correct',
  num_correct_in_a_row_10: 'Goal: 10 in a row',
  num_correct_in_a_row_2: 'Goal: 2 in a row',
  num_correct_in_a_row_3: 'Goal: 3 in a row',
  num_correct_in_a_row_5: 'Goal: 5 in a row',
  m_of_n: 'M of N...',
  do_all_description:
    'Learner must answer all questions in the exercise correctly (not recommended for long exercises)',
  num_correct_in_a_row_10_description: 'Learner must answer 10 questions in a row correctly',
  num_correct_in_a_row_2_description: 'Learner must answer 2 questions in a row correctly',
  num_correct_in_a_row_3_description: 'Learner must answer 3 questions in a row correctly',
  num_correct_in_a_row_5_description: 'Learner must answer 5 questions in a row correctly',
  m_of_n_description:
    'Learner must answer M questions correctly from the last N answered questions. For example, ‘3 of 5’ means learners must answer 3 questions correctly out of the 5 most recently answered.',
  input_question: 'Numeric input',
  multiple_selection: 'Multiple choice',
  single_selection: 'Single choice',
  perseus_question: 'Khan Academy question',
  true_false: 'True/False',
  unknown_question: 'Unknown question type',
  mp4: 'MP4 video',
  webm: 'WEBM video',
  vtt: 'VTT caption',
  mp3: 'MP3 audio',
  pdf: 'PDF document',
  epub: 'EPub document',
  kpub: 'KPub document',
  bloompub: 'BloomPub document',
  jpg: 'JPG image',
  jpeg: 'JPEG image',
  png: 'PNG image',
  gif: 'GIF image',
  json: 'JSON',
  svg: 'SVG image',
  perseus: 'Perseus Exercise',
  zip: 'HTML5 zip',
  topic: 'Folder',
  video: 'Video',
  audio: 'Audio',
  document: 'Document',
  exercise: 'Exercise',
  h5p: 'H5P App',
  html5: 'HTML5 App',
  slideshow: 'Slideshow',
  zim: 'ZIM',
  coach: 'Coaches',
  learner: 'Anyone',
  high_res_video: 'High resolution',
  low_res_video: 'Low resolution',
  video_subtitle: 'Captions',
  html5_zip: 'HTML5 zip',
  imscp_zip: 'IMSCP zip',
  video_thumbnail: 'Thumbnail',
  audio_thumbnail: 'Thumbnail',
  document_thumbnail: 'Thumbnail',
  exercise_thumbnail: 'Thumbnail',
  topic_thumbnail: 'Thumbnail',
  html5_thumbnail: 'Thumbnail',
  'CC BY': 'CC BY',
  'CC BY-SA': 'CC BY-SA',
  'CC BY-ND': 'CC BY-ND',
  'CC BY-NC': 'CC BY-NC',
  'CC BY-NC-SA': 'CC BY-NC-SA',
  'CC BY-NC-ND': 'CC BY-NC-ND',
  'All Rights Reserved': 'All Rights Reserved',
  'Public Domain': 'Public Domain',
  'Special Permissions': 'Special Permissions',
  'CC BY_description':
    'The Attribution License lets others distribute, remix, tweak, and build upon your work, even commercially, as long as they credit you for the original creation. This is the most accommodating of licenses offered. Recommended for maximum dissemination and use of licensed materials.',
  'CC BY-SA_description':
    'The Attribution-ShareAlike License lets others remix, tweak, and build upon your work even for commercial purposes, as long as they credit you and license their new creations under the identical terms. This license is often compared to "copyleft" free and open source software licenses. All new works based on yours will carry the same license, so any derivatives will also allow commercial use. This is the license used by Wikipedia, and is recommended for materials that would benefit from incorporating content from Wikipedia and similarly licensed projects.',
  'CC BY-ND_description':
    'The Attribution-NoDerivs License allows for redistribution, commercial and non-commercial, as long as it is passed along unchanged and in whole, with credit to you.',
  'CC BY-NC_description':
    "The Attribution-NonCommercial License lets others remix, tweak, and build upon your work non-commercially, and although their new works must also acknowledge you and be non-commercial, they don't have to license their derivative works on the same terms.",
  'CC BY-NC-SA_description':
    'The Attribution-NonCommercial-ShareAlike License lets others remix, tweak, and build upon your work non-commercially, as long as they credit you and license their new creations under the identical terms.',
  'CC BY-NC-ND_description':
    "The Attribution-NonCommercial-NoDerivs License is the most restrictive of our six main licenses, only allowing others to download your works and share them with others as long as they credit you, but they can't change them in any way or use them commercially.",
  'All Rights Reserved_description':
    'The All Rights Reserved License indicates that the copyright holder reserves, or holds for their own use, all the rights provided by copyright law under one specific copyright treaty.',
  'Public Domain_description':
    'Public Domain work has been identified as being free of known restrictions under copyright law, including all related and neighboring rights.',
  'Special Permissions_description':
    'Special Permissions is a custom license to use when the current licenses do not apply to the content. The owner of this license is responsible for creating a description of what this license entails.',

  // global copy strings
  firstCopy: 'Copy of {title}',
  nthCopy: 'Copy {n, number, integer} of {title}',
});

export const constantsTranslationMixin = {
  methods: {
    translateConstant(constant) {
      /*
       * Prevent translation of null, undefined and empty keys. Initially, translation would
       * default to `ConstantStrings.<key>` if not found, which is not desired on the front-end.
       */
      return constant && constantStrings.$tr(constant);
    },
    translateLanguage(language) {
      return Languages.has(language) && Languages.get(language).native_name;
    },
    translateLicense(license) {
      return Licenses.has(license) && this.translateConstant(Licenses.get(license).license_name);
    },
  },
};

// METADATA MIXIN

export const metadataTranslationMixin = {
  methods: {
    translateMetadataString(key) {
      return translateMetadataString(key);
    },
  },
};

/**
 * jayoshih: using a mixin to handle this to handle the translations
 *           and handle cases where user opens page at a component
 */

export const routerMixin = {
  methods: {
    updateTabTitle(title) {
      updateTabTitle(title);
    },
  },
};

export const contentNodeStrings = createTranslator('ContentNodeStrings', { untitled: 'Untitled' });
export const titleMixin = {
  computed: {
    hasTitle() {
      return node => node && node.title && node.title.trim();
    },
    getTitle() {
      return node => (this.hasTitle(node) ? node.title : contentNodeStrings.$tr('untitled'));
    },
    getTitleClass() {
      return node => (this.hasTitle(node) ? 'notranslate' : '');
    },
  },
};

export const printingMixin = {
  inject: {
    printing: {
      from: 'printing',
      default: false,
    },
  },
};

export function generateSearchMixin(filterMap) {
  return {
    computed: {
      ...transform(
        filterMap,
        (result, type, key) => {
          result[key] = {
            get() {
              if (type === filterTypes.MULTISELECT) {
                return this.$route.query[key] ? this.$route.query[key].split(',') : [];
              } else if (type === filterTypes.BOOLEAN) {
                return String(this.$route.query[key]) === 'true';
              }
              return this.$route.query[key];
            },
            set(value) {
              if (type === filterTypes.MULTISELECT) {
                value.length
                  ? this.updateQueryParams({ [key]: uniq(value).join(',') })
                  : this.deleteQueryParam(key);
              } else if (type === filterTypes.BOOLEAN) {
                value ? this.updateQueryParams({ [key]: value }) : this.deleteQueryParam(key);
              } else {
                this.updateQueryParams({ [key]: value });
              }
            },
          };
        },
        {},
      ),
      filterKeys() {
        return Object.keys(filterMap).filter(k => this.$route.query[k]);
      },
    },
    methods: {
      deleteQueryParam(key) {
        const query = { ...this.$route.query };
        delete query[key];

        this.navigate(query);
      },
      updateQueryParams(params) {
        const query = {
          ...this.$route.query,
          ...params,
        };
        this.navigate(query);
      },
      clearFilters() {
        this.navigate({});
      },
      navigate(params) {
        if (!isEqual(this.$route.query, params)) {
          this.$router
            .replace({
              ...this.$route,
              query: {
                ...params,
                page: 1, // Make sure we're on page 1 for every new query
              },
            })
            .catch(error => {
              if (error && error.name != 'NavigationDuplicated') {
                throw error;
              }
            });
        }
      },
    },
  };
}

/*
  Return mixin based on form fields passed in
  Sample form field data:
    {
      fieldName: {
        required: false,
        multiSelect: false,
        validator: value => Boolean(value)
      }
    }
*/
function _cleanMap(formFields) {
  // Make sure all fields have the relevant validator field
  return transform(
    formFields,
    (result, value, key) => {
      result[key] = value;
      // Make sure all fields have a validator
      // Some fields depend on other fields, so pass in
      // context to use in validator (e.g. checking an "other"
      // option may require a text field as a result)
      if (value.validator) {
        result[key].validator = value.validator;
      } else if (!value.required) {
        result[key].validator = () => true;
      } else if (value.multiSelect) {
        // eslint-disable-next-line no-unused-vars
        result[key].validator = (v, _) => Boolean(v.length);
      } else {
        // eslint-disable-next-line no-unused-vars
        result[key].validator = (v, _) => Boolean(v);
      }
    },
    {},
  );
}

const formStrings = createTranslator('formStrings', {
  errorText: 'Please fix {count, plural,\n =1 {# error}\n other {# errors}} below',
});

export function generateFormMixin(formFields) {
  const cleanedMap = _cleanMap(formFields);

  return {
    data() {
      return {
        // Store errors
        errors: {},

        // Store entries
        form: transform(
          formFields,
          (result, value, key) => {
            result[key] = value.multiSelect ? [] : '';
          },
          {},
        ),
      };
    },
    computed: {
      formStrings() {
        return formStrings;
      },

      // Create getters/setters for all items
      ...transform(
        cleanedMap,
        function (result, value, key) {
          result[key] = {
            get() {
              return this.form[key] || (value.multiSelect ? [] : '');
            },
            set(v) {
              this.$set(this.form, key, v);
              if (!value.validator(v, this)) {
                this.$set(this.errors, key, true);
              } else {
                this.$delete(this.errors, key);
              }
            },
          };
        },
        {},
      ),
    },
    methods: {
      /*
        For some reason, having an errorCount computed
        property doesn't get updated on form changes.
        Use methods to track errorCount and errorText instead
      */
      errorCount() {
        return Object.keys(this.errors).length;
      },
      errorText() {
        return this.formStrings.$tr('errorText', {
          count: this.errorCount(),
        });
      },
      clean() {
        return transform(
          cleanedMap,
          (result, value, key) => {
            result[key] = this[key];
            if (value.multiSelect) {
              result[key] = result[key] || [];
            } else {
              result[key] = (result[key] || '').trim();
            }
          },
          {},
        );
      },
      validate(formData) {
        this.errors = transform(
          cleanedMap,
          (result, value, key) => {
            if (!value.validator(formData[key], this)) {
              result[key] = true;
            }
          },
          {},
        );
        return !Object.keys(this.errors).length;
      },
      submit() {
        const formData = this.clean();
        if (this.validate(formData)) {
          this.onSubmit(formData);
        } else {
          this.onValidationFailed();
        }
      },
      // eslint-disable-next-line no-unused-vars
      onSubmit(formData) {
        throw Error('Must implement onSubmit when using formMixin');
      },
      onValidationFailed() {
        // Optional method for forms - overwrite in components
      },
      reset() {
        this.form = {};
        this.resetValidation();
      },
      resetValidation() {
        this.errors = {};
      },
    },
  };
}
