import vuetifyIcons from 'vuetify/lib/components/Vuetify/mixins/icons';
import Icon from 'shared/views/Icon';

export default function icons(additional = {}) {
  const iconMap = vuetifyIcons('md', additional);

  return Object.entries(iconMap)
    .map(([name, mdName]) => {
      return {
        [name]: {
          component: Icon,
          props: {
            icon: mdName,
          },
        },
      };
    })
    .reduce((icons, icon) => Object.assign(icons, icon), {});
}
