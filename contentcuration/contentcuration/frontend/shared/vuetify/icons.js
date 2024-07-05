import Vue from 'vue';
import vuetifyIcons from 'vuetify/lib/components/Vuetify/mixins/icons';
import VIconWrapper from 'shared/views/VIconWrapper';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

Vue.component(VIconWrapper.name, VIconWrapper);

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

export default function icons(additional = {}) {
  // Grab icon name mapping from Vuetify. `md` is default icon font set
  const iconMap = vuetifyIcons('md', additional);

  // Update icons to use our custom `Icon` component which adds a layer between implementation
  // within Vuetify and our code, and the underlying `VIcon` component
  const vuetifyUpdatedIcons = Object.entries(iconMap)
    .map(([name, mdName]) => {
      return {
        [name]: {
          component: VIconWrapper.name,
          props: {
            iconName: mdName,
          },
        },
      };
    })
    .reduce((icons, icon) => Object.assign(icons, icon), {});
  return {
    ...vuetifyUpdatedIcons,
  };
}
