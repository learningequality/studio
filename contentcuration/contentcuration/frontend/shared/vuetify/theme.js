import { themeBrand, themePalette, themeTokens } from 'kolibri-design-system/lib/styles/theme';

export default function theme() {
  const palette = themePalette();
  const brand = themeBrand();
  const tokens = themeTokens();
  return Object.assign(
    {
      loading: palette.grey.v_900,
      primaryBackground: brand.primary.v_100,
      backgroundColor: palette.grey.v_100,
      greyBackground: palette.grey.v_300,
      greyBorder: palette.grey.v_400,
      grey: palette.grey.v_700,
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
      channelHighlightDefault: palette.grey.v_300,
      draggableDropZone: palette.grey.v_200,
      draggableDropOverlay: brand.primary.v_200,
      greenHighlightBackground: brand.secondary.v_100,
      roleVisibilityCoach: palette.lightblue.v_600,
    },
    tokens,
  );
}
