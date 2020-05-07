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
