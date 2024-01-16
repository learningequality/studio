import { themeBrand, themePalette, themeTokens } from 'kolibri-design-system/lib/styles/theme';

export default function theme() {
  const palette = themePalette();
  const brand = themeBrand();
  const tokens = themeTokens();
  return Object.assign(
    {
      secondary: brand.secondary.v_1000,
      primaryBackground: brand.primary.v_200,
      backgroundColor: palette.grey.v_50,
      greyBackground: palette.grey.v_200,
      greyBorder: palette.grey.v_400,
      grey: palette.grey.v_600,
      darkGrey: palette.grey.v_800,
      greenSuccess: tokens.success,
      topic: palette.grey.v_400,
      video: tokens.watch,
      audio: tokens.listen,
      document: tokens.read,
      exercise: tokens.practice,
      h5p: tokens.explore,
      html5: tokens.explore,
      zim: tokens.explore,
      slideshow: tokens.read,
      channelHighlightDefault: palette.grey.v_200,
      draggableDropZone: palette.grey.v_100,
      draggableDropOverlay: brand.primary.v_400,
      greenHighlightBackground: brand.secondary.v_200,
      roleVisibilityCoach: palette.lightblue.v_600,
    },
    tokens
  );
}

console.log(themeTokens())