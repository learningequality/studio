import Vue from 'vue';
import vuetifyIcons from 'vuetify/lib/components/Vuetify/mixins/icons';
import AppIcon from 'shared/views/AppIcon';

Vue.component(AppIcon.name, AppIcon);

export default function icons(additional = {}) {
  const iconMap = vuetifyIcons('md', additional);

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
