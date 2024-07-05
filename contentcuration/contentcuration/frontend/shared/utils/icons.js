import camelCase from 'lodash/camelCase';
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
  return icon ? CONTENT_KIND_ICONS[icon] : 'error';
}

export function getLearningActivityIcon(activity) {
  if (activity.toLowerCase() === 'explore') {
    return 'interactShaded';
  } else if (activity === 'multiple') {
    return 'allActivities';
  } else {
    return `${camelCase(activity) + 'Solid'}`;
  }
}
