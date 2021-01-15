import colors from 'vuetify/es5/util/colors';
import { themeTokens } from 'kolibri-design-system/lib/styles/theme';

export default function theme() {
  return Object.assign(
    {
      purple: '#996189',
      primary: '#996189',
      secondary: '#8DC5B6',
      primaryBackground: colors.purple.lighten5,
      backgroundColor: colors.grey.lighten5,
      greyBackground: colors.grey.lighten3,
      greyBorder: colors.grey.lighten1,
      grey: colors.grey.darken1,
      darkGrey: colors.grey.darken2,
      greenSuccess: '#4db6ac',
      topic: colors.grey.base,
      video: '#283593',
      image: '#283593', // IDK what this is supposed to be
      audio: '#f06292',
      document: '#ff3d00',
      exercise: '#4db6ac',
      html5: '#ff8f00',
      slideshow: '#4ece90',
      channelHighlightDefault: colors.grey.lighten3,
      draggableDropZone: '#dddddd',
      draggableDropOverlay: '#996189',
      greenHighlightBackground: '#E3F0ED',
    },
    themeTokens()
  );
}
