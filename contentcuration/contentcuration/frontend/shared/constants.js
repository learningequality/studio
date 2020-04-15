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

// Should correspond to https://github.com/learningequality/le-utils/blob/master/le_utils/constants/content_kinds.py
// TODO: Move constants to JSON and also publish for JS client
// code from the same source?
export const ContentNodeKind = {
  TOPIC: 'topic',
  VIDEO: 'video',
  AUDIO: 'audio',
  EXERCISE: 'exercise',
  DOCUMENT: 'document',
  HTML5: 'html5',
  SLIDESHOW: 'slideshow',
  H5P: 'h5p',
};
