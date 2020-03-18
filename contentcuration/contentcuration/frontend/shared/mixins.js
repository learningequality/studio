import { mapGetters } from 'vuex';
import Languages from 'shared/leUtils/Languages';
import { createTranslator } from 'shared/i18n/utils';

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
  const unit = [ONE_TB, ONE_GB, ONE_MB, ONE_KB].find(x => bytes >= x) || ONE_B;
  return sizeStrings.$tr(stringMap[unit], { n: Math.floor(bytes / unit) });
}

export const fileSizeMixin = {
  methods: {
    formatFileSize(size) {
      return bytesForHumans(size || 0);
    },
  },
};

const statusStrings = createTranslator('StatusStrings', {
  uploadFileSize: '{uploaded} of {total}',
  uploadFailedError: 'Upload failed',
  noStorageHeader: 'Not enough space',
});

export const fileStatusMixin = {
  mixins: [fileSizeMixin],
  computed: {
    ...mapGetters('file', ['getStatusMessage', 'getProgress']),
  },
  methods: {
    statusMessage(fileIDs) {
      let errorMessage = this.getStatusMessage(fileIDs);
      if (errorMessage) {
        return errorMessage;
      }
      let progress = this.getProgress(fileIDs);
      if (progress.total) {
        return this.sizeStrings('uploadFileSize')
          .replace('{uploaded}', this.formatFileSize(progress.uploaded))
          .replace('{total}', this.formatFileSize(progress.total));
      }
    },
  },
};

export const constantStrings = createTranslator('ConstantStrings', {
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
  zip: 'HTML5 Zip',
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
  },
};
