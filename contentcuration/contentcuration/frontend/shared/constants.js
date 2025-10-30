import invert from 'lodash/invert';
import Subjects from 'kolibri-constants/labels/Subjects';
import CompletionCriteria from 'kolibri-constants/CompletionCriteria';
import ContentLevels from 'kolibri-constants/labels/Levels';
import ResourcesNeededTypes from 'kolibri-constants/labels/Needs';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
import featureFlagsSchema from 'static/feature_flags.json';

export { default as LearningActivities } from 'kolibri-constants/labels/LearningActivities';
export { default as CompletionCriteriaModels } from 'kolibri-constants/CompletionCriteria';
export { default as Categories } from 'kolibri-constants/labels/Subjects';
export { default as AccessibilityCategories } from 'kolibri-constants/labels/AccessibilityCategories';
export { default as ContentLevels } from 'kolibri-constants/labels/Levels';
export { default as ResourcesNeededTypes } from 'kolibri-constants/labels/Needs';

export const CategoriesLookup = invert(Subjects);
export const CompletionCriteriaLookup = invert(CompletionCriteria);
export const LevelsLookup = invert(ContentLevels);
export const NeedsLookup = invert(ResourcesNeededTypes);

export const ContentDefaults = {
  author: 'author',
  provider: 'provider',
  aggregator: 'aggregator',
  copyright_holder: 'copyrightHolder',
  license: 'license',
  license_description: 'licenseDescription',
  auto_derive_audio_thumbnail: 'autoDeriveAudioThumbnail',
  auto_derive_document_thumbnail: 'autoDeriveDocumentThumbnail',
  auto_derive_html5_thumbnail: 'autoDeriveHtml5Thumbnail',
  auto_derive_video_thumbnail: 'autoDeriveVideoThumbnail',
};

export const ContentDefaultsDefaults = {
  author: '',
  provider: '',
  aggregator: '',
  copyright_holder: '',
  license: '',
  license_description: '',
  auto_derive_audio_thumbnail: true,
  auto_derive_document_thumbnail: true,
  auto_derive_html5_thumbnail: true,
  auto_derive_video_thumbnail: true,
};

// This symbol is used in cases where we want to set a default value
// for a symbol but have it be identifiable as a fill in.
export const NOVALUE = Symbol('No value default');

// This symbol is used as a key on objects that are new to indicate
// that they have not yet been committed to our IndexedDB layer.
export const NEW_OBJECT = Symbol('New object');

// This symbol is used as a key on new objects used to denote when
// validation should be delayed
export const DELAYED_VALIDATION = Symbol('Delayed validation');

export const kindToIconMap = {
  audio: 'headset',
  channel: 'apps',
  document: 'description',
  exercise: 'star',
  h5p: 'widgets',
  html5: 'widgets',
  image: 'image',
  slideshow: 'photo_library',
  topic: 'folder',
  video: 'theaters',
  zim: 'widgets',
};

export const SharingPermissions = {
  EDIT: 'edit',
  VIEW_ONLY: 'view',
};

// File constants
export const fileErrors = {
  NO_STORAGE: 'NO_STORAGE',
  WRONG_TYPE: 'WRONG_TYPE',
  TOO_LARGE: 'TOO_LARGE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  URL_EXPIRED: 'URL_EXPIRED',
  CHECKSUM_HASH_FAILED: 'CHECKSUM_HASH_FAILED',
};

export const MAX_FILE_SIZE = 209715200;

export const ASPECT_RATIO = 16 / 9;

export const THUMBNAIL_WIDTH = 250;

export const ONE_B = 1;
export const ONE_KB = 10 ** 3;
export const ONE_MB = 10 ** 6;
export const ONE_GB = 10 ** 9;
export const ONE_TB = 10 ** 12;

// Policy constants
export const policies = {
  PRIVACY: 'privacy_policy',
  TERMS_OF_SERVICE: 'terms_of_service',
  COMMUNITY_STANDARDS: 'community_standards',
};
export const requiredPolicies = [policies.PRIVACY, policies.TERMS_OF_SERVICE];
export const policyDates = {
  [policies.PRIVACY]: new Date('2020-12-10'),
  [policies.TERMS_OF_SERVICE]: new Date('2020-12-10'),
  [policies.COMMUNITY_STANDARDS]: new Date('2020-08-30'),
};

export function createPolicyKey(policyName, policyDate) {
  const policyYear = policyDate.getUTCFullYear();
  const policyMonth = policyDate.getUTCMonth() + 1;
  const policyDay = policyDate.getUTCDate();
  return `${policyName}_${policyYear}_${policyMonth}_${policyDay}`;
}

export const policyKeys = Object.entries(policyDates).map(([key, value]) => {
  return createPolicyKey(key, value);
});

// Filter constants
export const filterTypes = {
  BOOLEAN: 'BOOLEAN',
  MULTISELECT: 'MULTISELECT',
  TEXT: 'TEXT',
  DATE: 'DATE',
};

export const ChannelListTypes = {
  // These field names are set in the ChannelSlimViewset
  PUBLIC: 'public',
  EDITABLE: 'edit',
  STARRED: 'bookmark',
  VIEW_ONLY: 'view',
};

export const ErrorTypes = Object.freeze({
  // For high-level channel workflows (e.g. view/edit details)
  CHANNEL_NOT_FOUND: 'CHANNEL_NOT_FOUND',
  CHANNEL_NOT_VIEWABLE: 'CHANNEL_NOT_VIEWABLE',
  // When non-channel objects are not found (e.g. users, sub-channel topics, collections)
  PAGE_NOT_FOUND: 'PAGE_NOT_FOUND',
  // Catch-all error
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  // When user does not have admin-level permissions
  USER_NOT_ADMIN: 'USER_NOT_ADMIN',
  // When user does not have object-level permissions (e.g. cannot edit a channel)
  UNAUTHORIZED: 'UNAUTHORIZED',
});

// should correspond to backend types
export const AssessmentItemTypes = {
  SINGLE_SELECTION: 'single_selection',
  MULTIPLE_SELECTION: 'multiple_selection',
  TRUE_FALSE: 'true_false',
  INPUT_QUESTION: 'input_question',
  PERSEUS_QUESTION: 'perseus_question',
  FREE_RESPONSE: 'free_response',
};

export const ValidationErrors = {
  TITLE_REQUIRED: 'TITLE_REQUIRED',
  LICENSE_REQUIRED: 'LICENSE_REQUIRED',
  COPYRIGHT_HOLDER_REQUIRED: 'COPYRIGHT_HOLDER_REQUIRED',
  LICENSE_DESCRIPTION_REQUIRED: 'LICENSE_DESCRIPTION_REQUIRED',
  MASTERY_MODEL_REQUIRED: 'MASTERY_MODEL_REQUIRED',
  MASTERY_MODEL_M_REQUIRED: 'MASTERY_MODEL_M_REQUIRED',
  MASTERY_MODEL_M_WHOLE_NUMBER: 'MASTERY_MODEL_M_WHOLE_NUMBER',
  MASTERY_MODEL_M_GT_ZERO: 'MASTERY_MODEL_M_GT_ZERO',
  MASTERY_MODEL_M_LTE_N: 'MASTERY_MODEL_M_LTE_N',
  MASTERY_MODEL_N_REQUIRED: 'MASTERY_MODEL_N_REQUIRED',
  MASTERY_MODEL_N_WHOLE_NUMBER: 'MASTERY_MODEL_N_WHOLE_NUMBER',
  MASTERY_MODEL_N_GT_ZERO: 'MASTERY_MODEL_N_GT_ZERO',
  QUESTION_REQUIRED: 'QUESTION_REQUIRED',
  INVALID_NUMBER_OF_CORRECT_ANSWERS: 'INVALID_NUMBER_OF_CORRECT_ANSWERS',
  INVALID_COMPLETION_TYPE_FOR_FREE_RESPONSE_QUESTION:
    'INVALID_COMPLETION_TYPE_FOR_FREE_RESPONSE_QUESTION',
  NO_VALID_PRIMARY_FILES: 'NO_VALID_PRIMARY_FILES',
  INVALID_COMPLETION_CRITERIA_MODEL: 'INVALID_COMPLETION_CRITERIA_MODEL',
  COMPLETION_REQUIRED: 'COMPLETION_REQUIRED',
  LEARNING_ACTIVITY_REQUIRED: 'LEARNING_ACTIVITY_REQUIRED',
  DURATION_REQUIRED: 'DURATION_REQUIRED',
  ACTIVITY_DURATION_REQUIRED: 'ACTIVITY_DURATION_REQUIRED',
  ACTIVITY_DURATION_MIN_FOR_SHORT_ACTIVITY: 'ACTIVITY_DURATION_MIN_FOR_SHORT_ACTIVITY',
  ACTIVITY_DURATION_MAX_FOR_SHORT_ACTIVITY: 'ACTIVITY_DURATION_MAX_FOR_SHORT_ACTIVITY',
  ACTIVITY_DURATION_MIN_FOR_LONG_ACTIVITY: 'ACTIVITY_DURATION_MIN_FOR_LONG_ACTIVITY',
  ACTIVITY_DURATION_MAX_FOR_LONG_ACTIVITY: 'ACTIVITY_DURATION_MAX_FOR_LONG_ACTIVITY',
  ACTIVITY_DURATION_MIN_REQUIREMENT: 'ACTIVITY_DURATION_MIN_REQUIREMENT',
  ACTIVITY_DURATION_TOO_LONG: 'ACTIVITY_DURATION_TOO_LONG',
  MISSING_NODE: 'MISSING_NODE',
  ...fileErrors,
};

export const FeatureFlagsSchema = featureFlagsSchema;

export const FeatureFlagKeys = Object.keys(FeatureFlagsSchema.properties).reduce(
  (featureFlags, featureFlag) => {
    featureFlags[featureFlag] = featureFlag;
    return featureFlags;
  },
  {},
);

export const ContentModalities = {
  QUIZ: 'QUIZ',
  SURVEY: 'SURVEY',
};

export const AccessibilityCategoriesMap = {
  document: ['ALT_TEXT', 'HIGH_CONTRAST', 'TAGGED_PDF'],
  video: ['CAPTIONS_SUBTITLES', 'AUDIO_DESCRIPTION', 'SIGN_LANGUAGE'],
  exercise: ['ALT_TEXT'],
  html5: ['ALT_TEXT', 'HIGH_CONTRAST'],
  h5p: ['ALT_TEXT', 'HIGH_CONTRAST'],
  audio: ['CAPTIONS_SUBTITLES'],
};

// an activity with duration longer than this value is considered long, otherwise short
export const SHORT_LONG_ACTIVITY_MIDPOINT = 1860;

export const CompletionDropdownMap = {
  allContent: 'allContent',
  completeDuration: 'completeDuration',
  determinedByResource: 'determinedByResource',
  goal: 'goal',
  practiceQuiz: 'practiceQuiz',
  reference: 'reference',
  survey: 'survey',
};

export const DurationDropdownMap = {
  EXACT_TIME: 'exactTime',
  SHORT_ACTIVITY: 'shortActivity',
  LONG_ACTIVITY: 'longActivity',
};

// Define an object to act as the place holder for non unique values.
export const nonUniqueValue = {};
nonUniqueValue.toString = () => '';

/**
 * Not all fields are updatable on descendants, for many of them does not
 * make sense to update to all the descendants, such as the title.
 */
export const DescendantsUpdatableFields = [
  'language',
  'categories',
  'grade_levels',
  'learner_needs',
];

export const ResourcesNeededOptions = [
  'PEERS',
  'TEACHER',
  'INTERNET',
  'SPECIAL_SOFTWARE',
  'PAPER_PENCIL',
  'OTHER_SUPPLIES',
];

// The constant mapping below is used to set
// default completion criteria and durations
// both as initial values in the edit modal, and
// to ensure backwards compatibility for contentnodes
// that were added before this was in place
export const defaultCompletionCriteriaModels = {
  [ContentKindsNames.VIDEO]: CompletionCriteria.TIME,
  [ContentKindsNames.AUDIO]: CompletionCriteria.TIME,
  [ContentKindsNames.DOCUMENT]: CompletionCriteria.PAGES,
  [ContentKindsNames.H5P]: CompletionCriteria.DETERMINED_BY_RESOURCE,
  [ContentKindsNames.HTML5]: CompletionCriteria.APPROX_TIME,
  [ContentKindsNames.ZIM]: CompletionCriteria.APPROX_TIME,
  [ContentKindsNames.EXERCISE]: CompletionCriteria.MASTERY,
};

export const defaultCompletionCriteriaThresholds = {
  // Audio and Video threshold defaults are dynamic based
  // on the duration of the file itself.
  [ContentKindsNames.DOCUMENT]: '100%',
  [ContentKindsNames.HTML5]: 300,
  // We cannot set an automatic default threshold for exercises.
};

export const CompletionOptionsDropdownMap = {
  [ContentKindsNames.DOCUMENT]: [
    CompletionDropdownMap.allContent,
    CompletionDropdownMap.completeDuration,
    CompletionDropdownMap.reference,
  ],
  [ContentKindsNames.EXERCISE]: [
    CompletionDropdownMap.goal,
    CompletionDropdownMap.practiceQuiz,
    CompletionDropdownMap.survey,
  ],
  [ContentKindsNames.HTML5]: [
    CompletionDropdownMap.completeDuration,
    CompletionDropdownMap.determinedByResource,
    CompletionDropdownMap.reference,
  ],
  [ContentKindsNames.ZIM]: [
    CompletionDropdownMap.completeDuration,
    CompletionDropdownMap.determinedByResource,
    CompletionDropdownMap.reference,
  ],
  [ContentKindsNames.H5P]: [
    CompletionDropdownMap.determinedByResource,
    CompletionDropdownMap.completeDuration,
    CompletionDropdownMap.reference,
  ],
  [ContentKindsNames.VIDEO]: [
    CompletionDropdownMap.completeDuration,
    CompletionDropdownMap.reference,
  ],
  [ContentKindsNames.AUDIO]: [
    CompletionDropdownMap.completeDuration,
    CompletionDropdownMap.reference,
  ],
};

export const completionCriteriaToDropdownMap = {
  [CompletionCriteria.TIME]: CompletionDropdownMap.completeDuration,
  [CompletionCriteria.APPROX_TIME]: CompletionDropdownMap.completeDuration,
  [CompletionCriteria.PAGES]: CompletionDropdownMap.allContent,
  [CompletionCriteria.DETERMINED_BY_RESOURCE]: CompletionDropdownMap.determinedByResource,
  [CompletionCriteria.MASTERY]: CompletionDropdownMap.goal,
  [CompletionCriteria.REFERENCE]: CompletionDropdownMap.reference,
};

export const CommunityLibraryStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUPERSEDED: 'SUPERSEDED',
  LIVE: 'LIVE',
};
