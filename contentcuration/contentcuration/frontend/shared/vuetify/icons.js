import Vue from 'vue';
import vuetifyIcons from 'vuetify/lib/components/Vuetify/mixins/icons';
import camelCase from 'lodash/camelCase';
import CollapseAllIcon from '../views/icons/CollapseAllIcon';
import IndicatorIcon from '../views/icons/IndicatorIcon';
import LightBulbIcon from '../views/icons/LightBulbIcon';
import ViewOnlyIcon from '../views/icons/ViewOnlyIcon';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
import Icon from 'shared/views/Icon';

Vue.component(Icon.name, Icon);

const EMPTY = '_empty';
export const CONTENT_KIND_ICONS = {
  [ContentKindsNames.TOPIC]: 'folder',
  [ContentKindsNames.TOPIC + EMPTY]: 'folder_open',
  [ContentKindsNames.VIDEO]: 'ondemand_video',
  [ContentKindsNames.AUDIO]: 'music_note',
  [ContentKindsNames.SLIDESHOW]: 'image',
  [ContentKindsNames.EXERCISE]: 'assignment',
  [ContentKindsNames.DOCUMENT]: 'class',
  [ContentKindsNames.HTML5]: 'widgets',
};

export function getContentKindIcon(kind, isEmpty = false) {
  const icon = (isEmpty ? [kind + EMPTY] : []).concat([kind]).find(k => k in CONTENT_KIND_ICONS);
  return icon ? CONTENT_KIND_ICONS[icon] : 'error_outline';
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

// Can use $vuetify.icons.iconName in <Icon> tags
const customIcons = {
  collapse_all: {
    component: CollapseAllIcon,
    props: {
      iconName: 'collapse_all',
    },
  },
  light_bulb: {
    component: LightBulbIcon,
    props: {
      iconsName: 'light_bulb',
    },
  },
  view_only: {
    component: ViewOnlyIcon,
    props: {
      iconName: 'view_only',
    },
  },
  indicator: {
    component: IndicatorIcon,
    props: {
      iconName: 'indicator',
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
