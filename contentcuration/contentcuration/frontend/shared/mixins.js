import camelCase from 'lodash/camelCase';
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

// METADATA STRINGS AND RELATED MIXIN

export const metadataStrings = createTranslator('CommonMetadataStrings', {
  // Titles/Headers

  learningActivity: {
    message: 'Learning Activity',
    context: 'A title for the category of education material interaction, i.e. watch, read, listen',
  },
  completion: {
    message: 'Completion',
    context: 'A title for the metadata that explains when an activity is finished',
  },
  duration: {
    message: 'Duration',
    context: 'A title for the metadata that explains how long an activity will take',
  },
  category: {
    message: 'Category',
    context: 'A title for the metadata that explains the subject matter of an activity',
  },
  // Completion criteria types
  reference: {
    message: 'Reference material',
    context:
      'One of the completion criteria types. Progress made on a resource with this criteria is not tracked.',
  },
  completeDuration: {
    message: 'When time spent is equal to duration',
    context:
      'One of the completion criteria types. A resource with this criteria is considered complete when learners spent given time studying it.',
  },
  exactTime: {
    message: 'Time to complete',
    context:
      'One of the completion criteria types. A subset of "When time spent is equal to duration". For example, for an audio resource with this criteria, learnes need to hear the whole length of audio for the resource to be considered complete.',
  },
  allContent: {
    message: 'Viewed in its entirety',
    context:
      'One of the completion criteria types. A resource with this criteria is considered complete when learners studied it all, for example they saw all pages of a document.',
  },
  determinedByResource: {
    message: 'Determined by the resource',
    context:
      'One of the completion criteria types. Typically used for embedded html5/h5p resources that contain their own completion criteria, for example reaching a score in an educational game.',
  },
  masteryMofN: {
    message: 'Goal: {m} out of {n}',
    context:
      'One of the completion criteria types specific to exercises. An exercise with this criteria is considered complete when learners answered m questions out of n correctly.',
  },
  goal: {
    message: 'When goal is met',
    context:
      'One of the completion criteria types specific to exercises. An exercise with this criteria is considered complete when learners reached a given goal, for example 100% correct.',
  },
  practiceQuiz: {
    message: 'Practice quiz',
    context:
      'One of the completion criteria types specific to exercises. An exercise with this criteria represents a quiz.',
  },
  survey: {
    message: 'Survey',
    context:
      'One of the completion criteria types specific to exercises. An exercise with this criteria represents a survey.',
  },

  // Learning Activities
  all: {
    message: 'All',
    context: 'A label for everything in the group of activities.',
  },
  watch: {
    message: 'Watch',
    context:
      'Resource and filter label for the type of learning activity with video. Translate as a VERB',
  },
  create: {
    message: 'Create',
    context: 'Resource and filter label for the type of learning activity. Translate as a VERB',
  },
  read: {
    message: 'Read',
    context:
      'Resource and filter label for the type of learning activity with documents. Translate as a VERB',
  },
  practice: {
    message: 'Practice',
    context:
      'Resource and filter label for the type of learning activity with questions and answers. Translate as a VERB',
  },
  reflect: {
    message: 'Reflect',
    context: 'Resource and filter label for the type of learning activity. Translate as a VERB',
  },
  listen: {
    message: 'Listen',
    context:
      'Resource and filter label for the type of learning activity with audio. Translate as a VERB',
  },
  explore: {
    message: 'Explore',
    context: 'Resource and filter label for the type of learning activity. Translate as a VERB',
  },

  // Library Categories
  school: {
    message: 'School',
    context: 'Category type.',
  },
  basicSkills: {
    message: 'Basic skills',
    context:
      'Category type. Basic skills refer to learning resources focused on aspects like literacy, numeracy and digital literacy.',
  },
  work: {
    message: 'Work',
    context:
      'Top level category group that contains resources for acquisition of professional skills.',
  },
  dailyLife: {
    message: 'Daily life',
    context: 'Category type. See https://en.wikipedia.org/wiki/Everyday_life',
  },
  forTeachers: {
    message: 'For teachers',
    context: 'Category type',
  },

  // School Categories
  mathematics: {
    message: 'Mathematics',
    context: 'Category type. See https://en.wikipedia.org/wiki/Mathematics',
  },
  sciences: {
    message: 'Sciences',
    context: 'Category type. See https://en.wikipedia.org/wiki/Science',
  },
  socialSciences: {
    message: 'Social sciences',
    context: 'Category type. See https://en.wikipedia.org/wiki/Social_science',
  },
  arts: {
    message: 'Arts',
    context: 'Refers to a category group type. See https://en.wikipedia.org/wiki/The_arts',
  },
  computerScience: {
    message: 'Computer science',
    context: 'Category type. See https://en.wikipedia.org/wiki/Computer_science',
  },
  languageLearning: {
    message: 'Language learning',
    context: 'Category type.',
  },
  history: {
    message: 'History',
    context: 'Category type.',
  },
  readingAndWriting: {
    message: 'Reading and writing',
    context: 'School subject category',
  },

  // Mathematics Subcategories
  arithmetic: {
    message: 'Arithmetic',
    context: 'Math category type. See https://en.wikipedia.org/wiki/Arithmetic',
  },
  algebra: {
    message: 'Algebra',
    context: 'A type of math category. See https://en.wikipedia.org/wiki/Algebra',
  },
  geometry: {
    message: 'Geometry',
    context: 'Category type.',
  },
  calculus: {
    message: 'Calculus',
    context: 'Math category type. https://en.wikipedia.org/wiki/Calculus',
  },
  statistics: {
    message: 'Statistics',
    context: 'A math category. See https://en.wikipedia.org/wiki/Statistics',
  },

  // Sciences Subcategories
  biology: {
    message: 'Biology',
    context: 'Science category type. See https://en.wikipedia.org/wiki/Biology',
  },
  chemistry: {
    message: 'Chemistry',
    context: 'Science category type. See https://en.wikipedia.org/wiki/Chemistry',
  },
  physics: {
    message: 'Physics',
    context: 'Category type. See https://en.wikipedia.org/wiki/Physics.',
  },
  earthScience: {
    message: 'Earth science',
    context: 'Category type. See https://en.wikipedia.org/wiki/Earth_science',
  },
  astronomy: {
    message: 'Astronomy',
    context: 'Science category type. See https://en.wikipedia.org/wiki/Astronomy',
  },

  //  Literature Subcategories
  literature: {
    message: 'Literature',
    context: 'Category type. See https://en.wikipedia.org/wiki/Literature',
  },
  readingComprehension: {
    message: 'Reading comprehension',
    context: 'Category type.',
  },
  writing: {
    message: 'Writing',
    context: 'Category type. See https://en.wikipedia.org/wiki/Writing',
  },
  logicAndCriticalThinking: {
    message: 'Logic and critical thinking',
    context: 'Category type. See https://en.wikipedia.org/wiki/Critical_thinking',
  },

  // Social Sciences Subcategories
  politicalScience: {
    message: 'Political science',
    context: 'Category type. See https://en.wikipedia.org/wiki/Political_science.',
  },
  sociology: {
    message: 'Sociology',
    context: 'Category type. See https://en.wikipedia.org/wiki/Sociology',
  },
  anthropology: {
    message: 'Anthropology',
    context: 'Category type. See https://en.wikipedia.org/wiki/Anthropology',
  },
  civicEducation: {
    message: 'Civic education',
    context:
      'Category type. Civic education is the study of the rights and obligations of citizens in society. See https://en.wikipedia.org/wiki/Civics',
  },

  // Arts Subcategories = {
  visualArt: {
    message: 'Visual art',
    context: 'Category type. See https://en.wikipedia.org/wiki/Visual_arts',
  },
  music: {
    message: 'Music',
    context: 'Category type. See https://en.wikipedia.org/wiki/Music',
  },
  dance: {
    message: 'Dance',
    context: 'Category type. See https://en.wikipedia.org/wiki/Dance',
  },
  drama: {
    message: 'Drama',
    context: 'Category type. See https://en.wikipedia.org/wiki/Drama',
  },

  //  Computer Science Subcategories
  programming: {
    message: 'Programming',
    context: 'Category type. See https://en.wikipedia.org/wiki/Computer_programming',
  },
  mechanicalEngineering: {
    message: 'Mechanical engineering',
    context: 'Category type. See https://en.wikipedia.org/wiki/Mechanical_engineering.',
  },
  webDesign: {
    message: 'Web design',
    context: 'Category type. See https://en.wikipedia.org/wiki/Web_design',
  },

  // Basic Skills
  literacy: {
    message: 'Literacy',
    context: 'Category type. See https://en.wikipedia.org/wiki/Literacy',
  },
  numeracy: {
    message: 'Numeracy',
    context: 'Category type. See https://en.wikipedia.org/wiki/Numeracy',
  },
  digitalLiteracy: {
    message: 'Digital literacy',
    context: 'Category type. See https://en.wikipedia.org/wiki/Digital_literacy',
  },
  learningSkills: {
    message: 'Learning skills',
    context:
      'A category label and type of basic skill.\nhttps://en.wikipedia.org/wiki/Study_skills',
  },

  // Work Categories
  professionalSkills: {
    message: 'Professional skills',
    context: 'Category type. Refers to skills that are related to a profession or a job.',
  },
  technicalAndVocationalTraining: {
    message: 'Technical and vocational training',
    context:
      'A level of education. See https://en.wikipedia.org/wiki/TVET_(Technical_and_Vocational_Education_and_Training)',
  },

  //  VocationalSubcategories
  softwareToolsAndTraining: {
    message: 'Software tools and training',
    context: 'Subcategory type for technical and vocational training.',
  },
  skillsTraining: {
    message: 'Skills training',
    context: 'Subcategory type for technical and vocational training.',
  },
  industryAndSectorSpecific: {
    message: 'Industry and sector specific',
    context: 'Subcategory type for technical and vocational training.',
  },

  // Daily Life Categories
  publicHealth: {
    message: 'Public health',
    context: 'Category type. See https://en.wikipedia.org/wiki/Public_health.',
  },
  entrepreneurship: {
    message: 'Entrepreneurship',
    context: 'Category type. See https://en.wikipedia.org/wiki/Entrepreneurship',
  },
  financialLiteracy: {
    message: 'Financial literacy',
    context: 'Category type. See https://en.wikipedia.org/wiki/Financial_literacy',
  },
  currentEvents: {
    message: 'Current events',
    context:
      "Category type. Could also be translated as 'News'. See https://en.wikipedia.org/wiki/News",
  },
  environment: {
    message: 'Environment',
    context: 'Category type. See https://en.wikipedia.org/wiki/Environmental_studies',
  },
  mediaLiteracy: {
    message: 'Media literacy',
    context: 'Category type. See https://en.wikipedia.org/wiki/Media_literacy',
  },
  diversity: {
    message: 'Diversity',
    context: 'Category type. See https://en.wikipedia.org/wiki/Diversity_(politics)',
  },
  mentalHealth: {
    message: 'Mental health',
    context: 'Category type. See https://en.wikipedia.org/wiki/Mental_health',
  },

  // Teacher-Specific Categories
  guides: {
    message: 'Guides',
    context:
      'Category label in the Kolibri resources library; refers to any guide-type material for teacher professional development.',
  },
  lessonPlans: {
    message: 'Lesson plans',
    context:
      'Category label in the Kolibri resources library; refers to lesson planning materials for teachers.',
  },

  // Resources Needed Categories = {
  forBeginners: {
    message: 'For beginners',
    context: 'Filter option and a label for the resources in the Kolibri Library.',
  },
  toUseWithPaperAndPencil: {
    message: 'Paper and pencil',
    context: 'Refers to a filter for resources.\n',
  },
  needsInternet: {
    message: 'Internet connection',
    context: 'Refers to a filter for resources.',
  },
  needsMaterials: {
    message: 'Other supplies',
    context: 'Refers to a filter for resources.\n',
  },
  softwareTools: {
    message: 'Other software tools',
    context: 'Refers to a filter for resources that need additional software to be used.',
  },
  peers: {
    message: 'Working with peers',
    context:
      'Refers to a filter for resources that require a learner to work with other learners to be used.',
  },
  teacher: {
    message: 'Working with a teacher',
    context:
      'Refers to a filter for resources that require a learner to work with a teacher to be used.',
  },

  // Accessibility category name
  accessibility: {
    message: 'Accessibility',
    context:
      'Allows the user to filter for all the resources with accessibility features for learners with disabilities.',
  },
  // Accessibility Categories
  signLanguage: {
    message: 'Includes sign language captions',
    context:
      'https://en.wikipedia.org/wiki/Sign_language\nhttps://en.wikipedia.org/wiki/List_of_sign_languages\nWherever communities of deaf people exist, sign languages have developed as useful means of communication, and they form the core of local Deaf cultures. Although signing is used primarily by the deaf and hard of hearing, it is also used by hearing individuals, such as those unable to physically speak, those who have trouble with spoken language due to a disability or condition (augmentative and alternative communication), or those with deaf family members, such as children of deaf adults. ',
  },
  audioDescription: {
    message: 'Includes audio descriptions',
    context:
      'Content has narration used to provide information surrounding key visual elements for the benefit of blind and visually impaired users.\nhttps://en.wikipedia.org/wiki/Audio_description',
  },
  taggedPdf: {
    message: 'Tagged PDF',
    context:
      'A tagged PDF includes hidden accessibility markups (tags) that make the document accessible to those who use screen readers and other assistive technology (AT).\n\nhttps://taggedpdf.com/what-is-a-tagged-pdf/',
  },
  altText: {
    message: 'Includes alternative text descriptions for images',
    context:
      'Alternative text, or alt text, is a written substitute for an image. It is used to describe information being provided by an image, graph, or any other visual element on a web page. It provides information about the context and function of an image for people with varying degrees of visual and cognitive impairments. When a screen reader encounters an image, it will read aloud the alternative text.\nhttps://www.med.unc.edu/webguide/accessibility/alt-text/',
  },
  highContrast: {
    message: 'Includes high contrast text for learners with low vision',
    context:
      "Accessibility filter used to search for resources that have high contrast color themes for users with low vision ('display' refers to digital content, not the hardware like screens or monitors).\nhttps://veroniiiica.com/2019/10/25/high-contrast-color-schemes-low-vision/",
  },
  captionsSubtitles: {
    message: 'Includes captions or subtitles',
    context:
      'Accessibility filter to search for video and audio resources that have text captions for users who are deaf or hard of hearing.\nhttps://www.w3.org/WAI/media/av/captions/',
  },

  // Used to categorize the level or audience of content
  // ContentLevels
  level: {
    message: 'Level',
    context: 'Refers to the educational learning level, such a preschool, primary, secondary, etc.',
  },
  preschool: {
    message: 'Preschool',
    context:
      'Refers to a level of education offered to children before they begin compulsory education at primary school.\n\nSee https://en.wikipedia.org/wiki/Preschool',
  },
  lowerPrimary: {
    message: 'Lower primary',
    context:
      'Refers to a level of learning. Approximately corresponds to the first half of primary school.',
  },
  upperPrimary: {
    message: 'Upper primary',
    context:
      'Refers to a level of education. Approximately corresponds to the second half of primary school.\n',
  },
  lowerSecondary: {
    message: 'Lower secondary',
    context:
      'Refers to a level of learning. Approximately corresponds to the first half of secondary school (high school).',
  },
  upperSecondary: {
    message: 'Upper secondary',
    context:
      'Refers to a level of education. Approximately corresponds to the second half of secondary school.',
  },
  tertiary: {
    message: 'Tertiary',
    context: 'A level of education. See https://en.wikipedia.org/wiki/Tertiary_education',
  },
  specializedProfessionalTraining: {
    message: 'Specialized professional training',
    context: 'Level of education that refers to training for a profession (job).',
  },
  allLevelsBasicSkills: {
    message: 'All levels -- basic skills',
    context: 'Refers to a type of educational level.',
  },
  allLevelsWorkSkills: {
    message: 'All levels -- work skills',
    context: 'Refers to a type of educational level.',
  },

  browseChannel: {
    message: 'Browse channel',
    context: 'Heading on page where a user can browse the content within a channel',
  },
  topicLabel: {
    message: 'Folder',
    context:
      'A collection of resources and other subfolders within a channel. Nested folders allow a channel to be organized as a tree or hierarchy.',
  },
  readReference: {
    message: 'Reference',
    context:
      "Label displayed for the 'Read' learning activity, used instead of the time duration information, to indicate a resource that may not need sequential reading from the beginning to the end. Similar concept as the 'reference' books in the traditional library, that the user just  'consults', and does not read from cover to cover.",
  },
  shortActivity: {
    message: 'Short activity',
    context: 'Label with time estimation for learning activities that take less than 30 minutes.',
  },
  longActivity: {
    message: 'Long activity',
    context: 'Label with time estimation for learning activities that take more than 30 minutes.',
  },
});

export const metadataTranslationMixin = {
  methods: {
    translateMetadataString(key) {
      const camelKey = camelCase(key);
      if (nonconformingKeys[key]) {
        key = nonconformingKeys[key];
      } else if (nonconformingKeys[camelKey]) {
        key = nonconformingKeys[camelKey];
      } else if (
        !metadataStrings.defaultMessages[key] &&
        metadataStrings.defaultMessages[camelKey]
      ) {
        key = camelKey;
      }
      return metadataStrings.$tr(key);
    },
  },
};

/**
 * An object mapping ad hoc keys (like those to be passed to CommonMetadataStrings()) which do not
 * conform to the expectations. Examples:
 *
 * - Misspelling of the key in CommonMetadataStrings but a kolibri-constant used to access it is
 *   spelled correctly and will not map.
 * - Keys were defined and string-froze which are not camelCase.
 * - Keys which, when _.camelCase()'ed will not result in a valid key, requiring manual mapping
 */
const nonconformingKeys = {
  PAPER_PENCIL: 'toUseWithPaperAndPencil',
  PEERS: 'peers',
  TEACHER: 'teacher',
  INTERNET: 'needsInternet',
  BASIC_SKILLS: 'allLevelsBasicSkills',
  FOUNDATIONS: 'basicSkills',
  foundationsLogicAndCriticalThinking: 'logicAndCriticalThinking',
  toolsAndSoftwareTraining: 'softwareToolsAndTraining',
  foundations: 'basicSkills',
  OTHER_SUPPLIES: 'needsMaterials',
  SPECIAL_SOFTWARE: 'softwareTools',
  PROFESSIONAL: 'specializedProfessionalTraining',
  WORK_SKILLS: 'allLevelsWorkSkills',
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
        {}
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
    {}
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
          {}
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
        function(result, value, key) {
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
        {}
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
          {}
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
          {}
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
