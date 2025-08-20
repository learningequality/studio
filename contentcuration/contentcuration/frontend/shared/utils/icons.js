import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

const EMPTY = '_empty';
const CONTENT_KIND_ICONS = {
  [ContentKindsNames.TOPIC]: 'topic',
  [ContentKindsNames.TOPIC + EMPTY]: 'emptyTopic',
  [ContentKindsNames.VIDEO]: 'video',
  [ContentKindsNames.AUDIO]: 'audio',
  [ContentKindsNames.SLIDESHOW]: 'slideshow',
  [ContentKindsNames.EXERCISE]: 'exercise',
  [ContentKindsNames.DOCUMENT]: 'document',
  [ContentKindsNames.HTML5]: 'html5',
  [ContentKindsNames.ZIM]: 'html5',
};

export function getContentKindIcon(kind, isEmpty = false) {
  const icon = (isEmpty ? [kind + EMPTY] : []).concat([kind]).find(k => k in CONTENT_KIND_ICONS);
  if (!icon) {
    throw new Error(`Icon not found for content kind: ${kind}`);
  }
  return CONTENT_KIND_ICONS[icon];
}
