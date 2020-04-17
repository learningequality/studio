// Constant values for ContentKinds sorted by id
const ContentKinds = new Set([
  'audio',
  'document',
  'exercise',
  'h5p',
  'html5',
  'slideshow',
  'topic',
  'video',
]);

export default ContentKinds;

export const ContentKindsList = Array.from(ContentKinds);

export const ContentKindsNames = {
  AUDIO: 'audio',
  DOCUMENT: 'document',
  EXERCISE: 'exercise',
  H5P: 'h5p',
  HTML5: 'html5',
  SLIDESHOW: 'slideshow',
  TOPIC: 'topic',
  VIDEO: 'video',
};
