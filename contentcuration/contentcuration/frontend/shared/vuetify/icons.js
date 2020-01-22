import Vue from 'vue';
import vuetifyIcons from 'vuetify/lib/components/Vuetify/mixins/icons';
import MDIcon from 'shared/views/MDIcon';

Vue.component(MDIcon.name, MDIcon);

export default function icons(additional = {}) {
  const iconMap = vuetifyIcons('md', additional);

  return Object.entries(iconMap)
    .map(([name, mdName]) => {
      return {
        [name]: {
          component: MDIcon.name,
          props: {
            iconName: mdName,
          },
        },
      };
    })
    .reduce((icons, icon) => Object.assign(icons, icon), {});
}
