import Vue from 'vue';
import vuetifyIcons from 'vuetify/lib/components/Vuetify/mixins/icons';
import AppIcon from 'shared/views/AppIcon';

Vue.component(AppIcon.name, AppIcon);

export default function icons(additional = {}) {
  // Grab icon name mapping from Vuetify. `md` is default icon font set
  const iconMap = vuetifyIcons('md', additional);

  // Update icons to use our custom `AppIcon` component which adds a layer between implementation
  // within Vuetify and our code, and the underlying `VIcon` component
  return Object.entries(iconMap)
    .map(([name, mdName]) => {
      return {
        [name]: {
          component: AppIcon.name,
          props: {
            iconName: mdName,
          },
        },
      };
    })
    .reduce((icons, icon) => Object.assign(icons, icon), {});
}
