import { mapGetters } from 'vuex';
import { fileErrors } from './constants';
import { createTranslator, updateTabTitle } from 'shared/i18n/utils';
import Languages from 'shared/leUtils/Languages';
import Licenses from 'shared/leUtils/Licenses';

const sizeStrings = createTranslator('BytesForHumansStrings', {
  fileSizeInBytes: '{n, number, integer} B',
  fileSizeInKilobytes: '{n, number, integer} KB',
  fileSizeInMegabytes: '{n, number, integer} MB',
  fileSizeInGigabytes: '{n, number, integer} GB',
  fileSizeInTerabytes: '{n, number, integer} TB',
});

const ONE_B = 1;
const ONE_KB = 10 ** 3;
const ONE_MB = 10 ** 6;
const ONE_GB = 10 ** 9;
const ONE_TB = 10 ** 12;

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
    statusMessage(checksum) {
      const errorMessage = this.errorMessage(checksum);
      if (errorMessage) {
        return errorMessage;
      }
      const file = this.getFileUpload(checksum);
      if (file.total) {
        return statusStrings.$tr('uploadFileSize', {
          uploaded: bytesForHumans(file.loaded),
          total: bytesForHumans(file.total),
        });
      }
    },
    errorMessage(checksum) {
      const file = this.getFileUpload(checksum);
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
  do_all: '100% Correct',
  num_correct_in_a_row_10: '10 in a row',
  num_correct_in_a_row_2: '2 in a row',
  num_correct_in_a_row_3: '3 in a row',
  num_correct_in_a_row_5: '5 in a row',
  m_of_n: 'M of N...',
  do_all_description:
    'Learner must answer all questions in the exercise correctly (not recommended for long exercises)',
  num_correct_in_a_row_10_description: 'Learner must answer ten questions in a row correctly',
  num_correct_in_a_row_2_description: 'Learner must answer two questions in a row correctly',
  num_correct_in_a_row_3_description: 'Learner must answer three questions in a row correctly',
  num_correct_in_a_row_5_description: 'Learner must answer five questions in a row correctly',
  m_of_n_description:
    'Learner must answer M questions correctly from the last N questions answered (e.g. 3 out of 5 means learners need to answer 3 questions correctly out of the 5 most recently answered questions)',
  input_question: 'Input Question',
  multiple_selection: 'Multiple Selection',
  single_selection: 'Single Selection',
  perseus_question: 'Perseus Question',
  true_false: 'True/False',
  unknown_question: 'Unknown Question Type',
  mp4: 'MP4 Video',
  vtt: 'VTT Subtitle',
  mp3: 'MP3 Audio',
  pdf: 'PDF Document',
  epub: 'EPub Document',
  jpg: 'JPG Image',
  jpeg: 'JPEG Image',
  png: 'PNG Image',
  gif: 'GIF Image',
  json: 'JSON',
  svg: 'SVG Image',
  perseus: 'Perseus Exercise',
  zip: 'HTML5 Zip',
  topic: 'Topic',
  video: 'Video',
  audio: 'Audio',
  document: 'Document',
  exercise: 'Exercise',
  h5p: 'H5P App',
  html5: 'HTML5 App',
  slideshow: 'Slideshow',
  coach: 'Coaches',
  learner: 'Anyone',
  high_res_video: 'High Resolution',
  low_res_video: 'Low Resolution',
  video_subtitle: 'Subtitle',
  html5_zip: 'HTML5 Zip',
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
});

export const constantsTranslationMixin = {
  methods: {
    translateConstant(constant) {
      return constantStrings.$tr(constant);
    },
    translateLanguage(language) {
      return Languages.has(language) && Languages.get(language).native_name;
    },
    translateLicense(license) {
      return Licenses.has(license) && this.translateConstant(Licenses.get(license).license_name);
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
