import Vue from 'vue';
import vuetifyIcons from 'vuetify/lib/components/Vuetify/mixins/icons';
import collapseAllIcon from '../views/icons/collapseAllIcon';
import lightBulbIcon from '../views/icons/lightBulbIcon';
import viewOnlyIcon from '../views/icons/viewOnlyIcon';
import contentPasteIcon from '../views/icons/contentPasteIcon';
import Icon from 'shared/views/Icon';
import ContentKinds from 'shared/leUtils/ContentKinds';

Vue.component(Icon.name, Icon);

const EMPTY = '_empty';
export const CONTENT_KIND_ICONS = {
  [ContentKinds.topic]: 'folder',
  [ContentKinds.topic + EMPTY]: 'folder_open',
  [ContentKinds.video]: 'ondemand_video',
  [ContentKinds.audio]: 'music_note',
  [ContentKinds.image]: 'image',
  [ContentKinds.exercise]: 'assignment',
  [ContentKinds.document]: 'class',
  [ContentKinds.html5]: 'widgets',
};

export function getContentKindIcon(kind, isEmpty = false) {
  const icon = (isEmpty ? [kind + EMPTY] : []).concat([kind]).find(k => k in CONTENT_KIND_ICONS);
  return icon ? CONTENT_KIND_ICONS[icon] : 'error_outline';
}

const customIcons = {
  collapse_all: {
    component: collapseAllIcon,
    props: {
      iconName: 'collapse_all',
    },
  },
  light_bulb: {
    component: lightBulbIcon,
    props: {
      iconsName: 'light_bulb',
    },
  },
  view_only: {
    component: viewOnlyIcon,
    props: {
      iconName: 'view_only',
    },
  },
  content_paste: {
    component: contentPasteIcon,
    props: {
      iconName: 'content_paste',
    },
  },
};

export default function icons(additional = {}) {
  // Grab icon name mapping from Vuetify. `md` is default icon font set
  const iconMap = vuetifyIcons('md', additional);

  // Update icons to use our custom `Icon` component which adds a layer between implementation
  // within Vuetify and our code, and the underlying `VIcon` component
  let vuetifyUpdatedIcons = Object.entries(iconMap)
    .map(([name, mdName]) => {
      return {
        [name]: {
          component: Icon.name,
          props: {
            iconName: mdName,
          },
        },
      };
    })
    .reduce((icons, icon) => Object.assign(icons, icon), {});
  return {
    ...vuetifyUpdatedIcons,
    ...customIcons,
  };
}
