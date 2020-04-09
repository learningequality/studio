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
