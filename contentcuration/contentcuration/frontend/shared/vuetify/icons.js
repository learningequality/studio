import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

const EMPTY = '_empty';
export const CONTENT_KIND_ICONS_VUETIFY = {
  [ContentKindsNames.TOPIC]: 'folder',
  [ContentKindsNames.TOPIC + EMPTY]: 'folder_open',
  [ContentKindsNames.VIDEO]: 'ondemand_video',
  [ContentKindsNames.AUDIO]: 'music_note',
  [ContentKindsNames.SLIDESHOW]: 'image',
  [ContentKindsNames.EXERCISE]: 'assignment',
  [ContentKindsNames.DOCUMENT]: 'class',
  [ContentKindsNames.HTML5]: 'widgets',
  [ContentKindsNames.ZIM]: 'widgets',
};

export function getContentKindIconDeprecated(kind, isEmpty = false) {
  const icon = (isEmpty ? [kind + EMPTY] : [])
    .concat([kind])
    .find(k => k in CONTENT_KIND_ICONS_VUETIFY);
  return icon ? CONTENT_KIND_ICONS_VUETIFY[icon] : 'error_outline';
}
