import featureFlagsSchema from 'static/feature_flags.json';

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

export const kindToIconMap = {
  audio: 'headset',
  channel: 'apps',
  document: 'description',
  exercise: 'star',
  html5: 'widgets',
  image: 'image',
  slideshow: 'photo_library',
  topic: 'folder',
  video: 'theaters',
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
};

export const ValidationErrors = {
  TITLE_REQUIRED: 'TITLE_REQUIRED',
  LICENSE_REQUIRED: 'LICENSE_REQUIRED',
  COMPLETION_REQUIRED: 'COMPLETION_REQUIRED',
  DURATION_REQUIRED: 'DURATION_REQUIRED',
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
  NO_VALID_PRIMARY_FILES: 'NO_VALID_PRIMARY_FILES',
  INVALID_COMPLETION_CRITERIA_MODEL: 'INVALID_COMPLETION_CRITERIA_MODEL',
  ...fileErrors,
};

export const FeatureFlagsSchema = featureFlagsSchema;

export const FeatureFlagKeys = Object.keys(FeatureFlagsSchema.properties).reduce(
  (featureFlags, featureFlag) => {
    featureFlags[featureFlag] = featureFlag;
    return featureFlags;
  },
  {}
);

export const ContentModalities = {
  QUIZ: 'QUIZ',
};

// Audiovisual and document have defaults set to the first dropdown option
// The rest have no defaults

export const completionDropdownMap = {
  document: [
    'All content viewed',
    'Complete duration',
  ],
  exercise: [
    'Practice until goal is met',
    'Short activity',
    'Long activity',
    'Reference',
    'Exact time to complete',
  ],
  zip: ['Short activity', 'Long activity', 'Reference', 'Exact time to complete'],
};

export const durationDropdownMap = {

  audio: ['Exact time to complete', 'Short activity', 'Long activity', 'Reference'],
  video: ['Exact time to complete', 'Short activity', 'Long activity', 'Reference'],
  document: [
    'Exact time to complete',
    'Short activity',
    'Long activity',
    'Reference',
  ]
}
