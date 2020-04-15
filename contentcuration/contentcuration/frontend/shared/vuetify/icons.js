import Vue from 'vue';
import vuetifyIcons from 'vuetify/lib/components/Vuetify/mixins/icons';
import collapseAllIcon from '../views/icons/collapseAllIcon';
import lightBulbIcon from '../views/icons/lightBulbIcon';
import viewOnlyIcon from '../views/icons/viewOnlyIcon';
import Icon from 'shared/views/Icon';

Vue.component(Icon.name, Icon);

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
